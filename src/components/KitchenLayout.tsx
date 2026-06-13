'use client';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Equipment, EquipmentType } from '@/types/equipment';
import type { KitchenLine } from '@/types/kitchenLine';
import type { KitchenPolyline } from '@/types/kitchenPolyline';
import type { CropRegion } from '@/types/project';
import { useProjects } from '@/hooks/useProjects';
import { ASTERA_PRESET } from '@/data/presets';
import type { KitchenPreset, PresetItem } from '@/data/presets';
import type { CatalogItem } from '@/types/catalog';
import { ASTERA_CATALOG_DEFAULT, catalogDisplayName } from '@/data/catalog';
import EquipmentItem from './EquipmentItem';
import KitchenLineEditor from './KitchenLineEditor';
import KitchenPolylineEditor from './KitchenPolylineEditor';
import LeftPanel, { type LeftPanelMode } from './LeftPanel';
import MappingPanel from './MappingPanel';
import RightPanel, { type AlignMode } from './RightPanel';
import EquipmentListPanel from './EquipmentListPanel';
import EquipmentCatalogModal from './EquipmentCatalogModal';

const PdfBackground = dynamic(() => import('./PdfBackground'), { ssr: false });
const PdfCropModal = dynamic(() => import('./PdfCropModal'), { ssr: false });

let idCounter = Date.now();
const genId = () => String(++idCounter);

function rotateEquip(e: Equipment, dir: 1 | -1): Equipment {
  const next = ((e.rotation + dir * 90) % 360 + 360) % 360 as 0 | 90 | 180 | 270;
  return { ...e, rotation: next };
}

function getDispW(e: Equipment) {
  const dw = e.displayWidth ?? e.width;
  const dh = e.displayHeight ?? e.depth;
  return (e.rotation === 90 || e.rotation === 270) ? dh : dw;
}
function getDispH(e: Equipment) {
  const dw = e.displayWidth ?? e.width;
  const dh = e.displayHeight ?? e.depth;
  return (e.rotation === 90 || e.rotation === 270) ? dw : dh;
}

// 浮動小数誤差の許容幅: 接触・微小ギャップを「重ならない」と判定するため
const EPS = 0.01;

function equipmentOverlap(a: Equipment, b: Equipment): boolean {
  const ar = a.x + getDispW(a), ab = a.y + getDispH(a);
  const br = b.x + getDispW(b), bb = b.y + getDispH(b);
  return !(ar <= b.x + EPS || a.x >= br - EPS || ab <= b.y + EPS || a.y >= bb - EPS);
}

type CropMode = 'kitchen' | 'equipment-list' | null;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

export default function KitchenLayout() {
  const {
    projectList, currentProject, pdfData, isLoadingPdf,
    updateProject, switchProject, createProject, deleteProject, uploadPdf,
  } = useProjects();

  // Derive project fields
  const equipments: Equipment[] = currentProject?.equipments ?? [];
  const kitchenLines: KitchenLine[] = currentProject?.kitchenLines ?? [];
  const kitchenPolylines: KitchenPolyline[] = currentProject?.kitchenPolylines ?? [];
  const showPdf: boolean = currentProject?.showPdf ?? true;
  const showEquipmentList: boolean = currentProject?.showEquipmentList ?? false;
  const canvasZoom: number = currentProject?.canvasZoom ?? 1.0;

  // Local UI state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pdfSize, setPdfSize] = useState<{ w: number; h: number } | null>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('equipment');
  // isEditingOutline は leftPanelMode から派生 — 二重管理を排除
  const isEditingOutline = leftPanelMode === 'outline';
  const [selectedPolylineId, setSelectedPolylineId] = useState<string | null>(null);
  const [polylineUndoStack, setPolylineUndoStack] = useState<KitchenPolyline[][]>([]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2);
  const [currentColor, setCurrentColor] = useState('#1a1a1a');
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<KitchenLine[][]>([]);
  const [cropMode, setCropMode] = useState<CropMode>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rightWidth, setRightWidth] = useState(390);
  const rightWidthRef = useRef(rightWidth);
  useEffect(() => { rightWidthRef.current = rightWidth; }, [rightWidth]);

  // プリセット確認ダイアログの状態
  const [presetConfirm, setPresetConfirm] = useState<KitchenPreset | null>(null);

  // 縮尺設定モード
  const [isSettingScale, setIsSettingScale] = useState(false);
  const [scalePoint1, setScalePoint1] = useState<{ x: number; y: number } | null>(null);
  const [scaleMousePos, setScaleMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 機器アクション Undo スタック（最大10ステップ）
  const [equipUndoStack, setEquipUndoStack] = useState<Equipment[][]>([]);

  // Shift+ドラッグ範囲選択
  const [dragSelect, setDragSelect] = useState<{
    startX: number; startY: number; curX: number; curY: number;
  } | null>(null);

  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [snapEquipGrid, setSnapEquipGrid] = useState(false);
  const snapEquipGridRef = useRef(false);
  useEffect(() => { snapEquipGridRef.current = snapEquipGrid; }, [snapEquipGrid]);

  // 重なっている機器ID
  const overlappingIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < equipments.length; i++) {
      for (let j = i + 1; j < equipments.length; j++) {
        if (equipmentOverlap(equipments[i], equipments[j])) {
          ids.add(equipments[i].id);
          ids.add(equipments[j].id);
        }
      }
    }
    return ids;
  }, [equipments]);


  // 図面マッピングモード
  const [isMappingMode, setIsMappingMode] = useState(false);
  const [mappingItem, setMappingItem] = useState<PresetItem | null>(null);
  const [mappedNumbers, setMappedNumbers] = useState<Set<number>>(new Set());
  const [mappingDrag, setMappingDrag] = useState<{
    startX: number; startY: number; curX: number; curY: number;
  } | null>(null);

  // Reset selection when project changes
  const prevProjectId = useRef(currentProject?.id);
  useEffect(() => {
    if (currentProject?.id !== prevProjectId.current) {
      prevProjectId.current = currentProject?.id;
      setSelectedIds(new Set());
      setSelectedLineId(null);
      setUndoStack([]);
      setPdfSize(null);
      setIsSettingScale(false);
      setScalePoint1(null);
      setEquipUndoStack([]);
      setDragSelect(null);
      setIsMappingMode(false);
      setMappingItem(null);
      setMappedNumbers(new Set());
      setMappingDrag(null);
      setShowCatalogModal(false);
      setLeftPanelMode('equipment');
      setSelectedPolylineId(null);
      setPolylineUndoStack([]);
    }
  }, [currentProject?.id]);

  // ── wrappers that write through to project ────────────────────────────────
  const setEquipments = useCallback((fn: Equipment[] | ((prev: Equipment[]) => Equipment[])) => {
    updateProject((prev) => ({
      equipments: typeof fn === 'function' ? fn(prev.equipments) : fn,
    }));
  }, [updateProject]);

  const setKitchenLines = useCallback((fn: KitchenLine[] | ((prev: KitchenLine[]) => KitchenLine[])) => {
    updateProject((prev) => ({
      kitchenLines: typeof fn === 'function' ? fn(prev.kitchenLines) : fn,
    }));
  }, [updateProject]);

  const setKitchenPolylines = useCallback((fn: KitchenPolyline[] | ((prev: KitchenPolyline[]) => KitchenPolyline[])) => {
    updateProject((prev) => ({
      kitchenPolylines: typeof fn === 'function' ? fn(prev.kitchenPolylines ?? []) : fn,
    }));
  }, [updateProject]);

  // ── derived ───────────────────────────────────────────────────────────────
  const selectedEqs = equipments.filter((e) => selectedIds.has(e.id));
  const singleSelected = selectedIds.size === 1 ? selectedEqs[0] ?? null : null;
  const selectedGroupIds = new Set(selectedEqs.map((e) => e.groupId).filter(Boolean) as string[]);
  const canGroup = selectedIds.size >= 2;
  const canUngroup = selectedEqs.some((e) => !!e.groupId);

  let groupBox: { x: number; y: number; w: number; h: number } | null = null;
  if (selectedEqs.length >= 2) {
    const xs = selectedEqs.map((e) => e.x);
    const ys = selectedEqs.map((e) => e.y);
    const rights = selectedEqs.map((e) => e.x + getDispW(e));
    const bottoms = selectedEqs.map((e) => e.y + getDispH(e));
    groupBox = {
      x: Math.min(...xs) - 4, y: Math.min(...ys) - 4,
      w: Math.max(...rights) - Math.min(...xs) + 8,
      h: Math.max(...bottoms) - Math.min(...ys) + 8,
    };
  }

  // ── equipment handlers ────────────────────────────────────────────────────
  const handleAdd = useCallback((type: EquipmentType, width: number, depth: number) => {
    const item: Equipment = {
      id: genId(), type, name: type, x: 100, y: 100,
      width, depth,
      displayWidth: width, displayHeight: depth,
      rotation: 0, memo: '',
    };
    setEquipments((prev) => [...prev, item]);
    setSelectedIds(new Set([item.id]));
  }, [setEquipments]);

  const handleSelectItem = useCallback((id: string, additive: boolean) => {
    const eq = equipments.find((e) => e.id === id);
    const gid = eq?.groupId;
    const toSelect = gid ? equipments.filter((e) => e.groupId === gid).map((e) => e.id) : [id];
    if (additive) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const allSelected = toSelect.every((sid) => next.has(sid));
        if (allSelected) toSelect.forEach((sid) => next.delete(sid));
        else toSelect.forEach((sid) => next.add(sid));
        return next;
      });
    } else {
      setSelectedIds(new Set(toSelect));
    }
  }, [equipments]);

  const handleMove = useCallback((id: string, x: number, y: number) => {
    const sx = snapEquipGridRef.current ? Math.round(x / 10) * 10 : x;
    const sy = snapEquipGridRef.current ? Math.round(y / 10) * 10 : y;
    setEquipments((prev) => {
      const item = prev.find(e => e.id === id);
      if (item) {
        const others = prev.filter(e => e.id !== id);
        if (!others.some(o => equipmentOverlap(item, o))) {
          if (others.some(o => equipmentOverlap({ ...item, x: sx, y: sy }, o))) return prev;
        }
      }
      return prev.map((e) => e.id === id ? { ...e, x: sx, y: sy } : e);
    });
  }, [setEquipments]);

  const handleMoveMultiple = useCallback((moves: Array<{ id: string; x: number; y: number }>) => {
    const snap = (v: number) => snapEquipGridRef.current ? Math.round(v / 10) * 10 : v;
    const snapMap = new Map(moves.map((m) => [m.id, { x: snap(m.x), y: snap(m.y) }]));
    const movedIds = new Set(moves.map(m => m.id));
    setEquipments((prev) => {
      const moved = prev.filter(e => movedIds.has(e.id));
      const others = prev.filter(e => !movedIds.has(e.id));
      if (!moved.some(m => others.some(o => equipmentOverlap(m, o)))) {
        const proposed = moved.map(e => { const p = snapMap.get(e.id)!; return { ...e, x: p.x, y: p.y }; });
        if (proposed.some(p => others.some(o => equipmentOverlap(p, o)))) return prev;
      }
      return prev.map((e) => { const m = snapMap.get(e.id); return m ? { ...e, x: m.x, y: m.y } : e; });
    });
  }, [setEquipments]);

  const handleUpdate = useCallback((updated: Equipment) => {
    setEquipments((prev) => prev.map((e) => e.id === updated.id ? updated : e));
  }, [setEquipments]);

  const handleResize = useCallback((id: string, dw: number, dh: number) => {
    const snap = (v: number) => snapEquipGridRef.current ? Math.round(v / 10) * 10 : v;
    const sw = snap(dw), sh = snap(dh);
    setEquipments((prev) => {
      const item = prev.find(e => e.id === id);
      if (item) {
        const testItem = { ...item, displayWidth: sw, displayHeight: sh };
        const others = prev.filter(e => e.id !== id);
        if (!others.some(o => equipmentOverlap(item, o))) {
          if (others.some(o => equipmentOverlap(testItem, o))) return prev;
        }
      }
      return prev.map((e) => e.id === id ? { ...e, displayWidth: sw, displayHeight: sh } : e);
    });
  }, [setEquipments]);

  // ── 機器 Undo ─────────────────────────────────────────────────────────────
  // ref でスナップショットを取ることで pushEquipUndo を安定した参照に保つ
  const equipmentsRef = useRef<Equipment[]>(equipments);
  useEffect(() => { equipmentsRef.current = equipments; }, [equipments]);

  const pushEquipUndo = useCallback(() => {
    setEquipUndoStack((prev) => [...prev.slice(-9), equipmentsRef.current]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEquipUndo = useCallback(() => {
    setEquipUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      setEquipments(restored);
      return prev.slice(0, -1);
    });
  }, [setEquipments]);

  const handleDelete = useCallback((id: string) => {
    pushEquipUndo();
    setEquipments((prev) => prev.filter((e) => e.id !== id));
    setSelectedIds(new Set());
  }, [pushEquipUndo, setEquipments]);

  const handleGroup = useCallback(() => {
    if (selectedIds.size < 2) return;
    const gid = genId();
    setEquipments((prev) => prev.map((e) => selectedIds.has(e.id) ? { ...e, groupId: gid } : e));
  }, [selectedIds, setEquipments]);

  const handleUngroup = useCallback(() => {
    setEquipments((prev) => {
      const groupIdsToBreak = new Set(
        prev.filter((e) => selectedIds.has(e.id) && e.groupId).map((e) => e.groupId as string)
      );
      return prev.map((e) =>
        (selectedIds.has(e.id) || (e.groupId && groupIdsToBreak.has(e.groupId)))
          ? { ...e, groupId: undefined } : e
      );
    });
  }, [selectedIds, setEquipments]);

  const handleDeleteAll = useCallback(() => {
    if (equipments.length === 0) return;
    if (!window.confirm(`配置済み機器をすべて削除しますか？（${equipments.length}件）`)) return;
    pushEquipUndo();
    setEquipments([]);
    setSelectedIds(new Set());
  }, [equipments, pushEquipUndo, setEquipments]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    pushEquipUndo();
    setEquipments((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
  }, [selectedIds, pushEquipUndo, setEquipments]);

  const handleRotateRight = useCallback(() => {
    if (selectedIds.size === 0) return;
    pushEquipUndo();
    setEquipments((prev) => prev.map((e) => selectedIds.has(e.id) ? rotateEquip(e, 1) : e));
  }, [selectedIds, setEquipments, pushEquipUndo]);

  const handleRotateLeft = useCallback(() => {
    if (selectedIds.size === 0) return;
    pushEquipUndo();
    setEquipments((prev) => prev.map((e) => selectedIds.has(e.id) ? rotateEquip(e, -1) : e));
  }, [selectedIds, setEquipments, pushEquipUndo]);

  const handleAlign = useCallback((mode: AlignMode) => {
    if (selectedIds.size < 2) return;
    const items = equipments.filter((e) => selectedIds.has(e.id));
    const nonSelected = equipments.filter((e) => !selectedIds.has(e.id));
    const minLeft  = Math.min(...items.map((e) => e.x));
    const maxRight = Math.max(...items.map((e) => e.x + getDispW(e)));
    const minTop   = Math.min(...items.map((e) => e.y));
    const maxBot   = Math.max(...items.map((e) => e.y + getDispH(e)));
    const posMap = new Map<string, { x: number; y: number }>();

    if (mode === 'left') {
      items.forEach(e => posMap.set(e.id, { x: Math.round(minLeft), y: e.y }));
    } else if (mode === 'right') {
      items.forEach(e => posMap.set(e.id, { x: Math.round(maxRight - getDispW(e)), y: e.y }));
    } else if (mode === 'top') {
      items.forEach(e => posMap.set(e.id, { x: e.x, y: Math.round(minTop) }));
    } else if (mode === 'bottom') {
      items.forEach(e => posMap.set(e.id, { x: e.x, y: Math.round(maxBot - getDispH(e)) }));
    } else if (mode === 'h-distribute') {
      const sorted = [...items].sort((a, b) => a.x - b.x);
      const totalW = sorted.reduce((s, e) => s + getDispW(e), 0);
      const gap = Math.max(0, sorted.length > 1 ? (maxRight - minLeft - totalW) / (sorted.length - 1) : 0);
      let nx = minLeft;
      sorted.forEach(e => { posMap.set(e.id, { x: Math.round(nx), y: e.y }); nx += getDispW(e) + gap; });
    } else if (mode === 'v-distribute') {
      const sorted = [...items].sort((a, b) => a.y - b.y);
      const totalH = sorted.reduce((s, e) => s + getDispH(e), 0);
      const gap = Math.max(0, sorted.length > 1 ? (maxBot - minTop - totalH) / (sorted.length - 1) : 0);
      let ny = minTop;
      sorted.forEach(e => { posMap.set(e.id, { x: e.x, y: Math.round(ny) }); ny += getDispH(e) + gap; });
    }

    // 左/右 → y方向に押し出し、上/下 → x方向に押し出して重なりを解消
    if (mode === 'left' || mode === 'right' || mode === 'top' || mode === 'bottom') {
      const pushY = mode === 'left' || mode === 'right';
      const sorted = [...items].sort((a, b) => {
        const pa = posMap.get(a.id)!;
        const pb = posMap.get(b.id)!;
        return pushY ? pa.y - pb.y : pa.x - pb.x;
      });
      const placed: Equipment[] = [];

      for (const item of sorted) {
        const pos = posMap.get(item.id)!;
        let resolved = false;

        for (let iter = 0; iter < 10000; iter++) {
          let hit = false;

          // selected 同士の重なりチェック
          for (const prev of placed) {
            const pp = posMap.get(prev.id)!;
            if (equipmentOverlap({ ...item, x: pos.x, y: pos.y }, { ...prev, x: pp.x, y: pp.y })) {
              if (pushY) pos.y = Math.ceil(pp.y + getDispH(prev));
              else       pos.x = Math.ceil(pp.x + getDispW(prev));
              hit = true;
              break;
            }
          }
          if (hit) continue;

          // non-selected との重なりチェック（同方向に押し出し）
          for (const ns of nonSelected) {
            if (equipmentOverlap({ ...item, x: pos.x, y: pos.y }, ns)) {
              if (pushY) pos.y = Math.ceil(ns.y + getDispH(ns));
              else       pos.x = Math.ceil(ns.x + getDispW(ns));
              hit = true;
              break;
            }
          }

          if (!hit) { resolved = true; break; }
        }

        if (!resolved) {
          window.alert('重なるため整列できません');
          return;
        }
        placed.push(item);
      }
    }

    pushEquipUndo();
    setEquipments((prev) => prev.map((e) => { const p = posMap.get(e.id); return p ? { ...e, ...p } : e; }));
  }, [selectedIds, equipments, setEquipments, pushEquipUndo]);

  // ── line handlers ─────────────────────────────────────────────────────────
  const handleSelectLine = useCallback((id: string | null) => {
    setSelectedLineId(id);
    if (id) {
      const line = kitchenLines.find((l) => l.id === id);
      if (line) { setCurrentStrokeWidth(line.strokeWidth); setCurrentColor(line.color); }
    }
  }, [kitchenLines]);

  const handleAddLine = useCallback((line: KitchenLine) => {
    setUndoStack((prev) => [...prev, kitchenLines]);
    setKitchenLines((prev) => [...prev, line]);
  }, [kitchenLines, setKitchenLines]);

  const handleDeleteLine = useCallback((id: string) => {
    setUndoStack((prev) => [...prev, kitchenLines]);
    setKitchenLines((prev) => prev.filter((l) => l.id !== id));
    setSelectedLineId(null);
  }, [kitchenLines, setKitchenLines]);

  const handleUpdateLine = useCallback((id: string, changes: Partial<KitchenLine>) => {
    setKitchenLines((prev) => prev.map((l) => l.id === id ? { ...l, ...changes } : l));
  }, [setKitchenLines]);

  const handleBeginDrag = useCallback(() => {
    setUndoStack((prev) => [...prev, kitchenLines]);
  }, [kitchenLines]);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      setKitchenLines(restored);
      return prev.slice(0, -1);
    });
  }, [setKitchenLines]);

  const handleClearKitchenLines = useCallback(() => {
    setUndoStack((prev) => [...prev, kitchenLines]);
    setKitchenLines([]);
    setSelectedLineId(null);
  }, [kitchenLines, setKitchenLines]);

  const handleStrokeWidthChange = useCallback((w: number) => {
    setCurrentStrokeWidth(w);
    if (selectedLineId) setKitchenLines((prev) => prev.map((l) => l.id === selectedLineId ? { ...l, strokeWidth: w } : l));
  }, [selectedLineId, setKitchenLines]);

  const handleColorChange = useCallback((c: string) => {
    setCurrentColor(c);
    if (selectedLineId) setKitchenLines((prev) => prev.map((l) => l.id === selectedLineId ? { ...l, color: c } : l));
  }, [selectedLineId, setKitchenLines]);

  // ── polyline handlers ─────────────────────────────────────────────────────
  const kitchenPolylinesRef = useRef<KitchenPolyline[]>(kitchenPolylines);
  useEffect(() => { kitchenPolylinesRef.current = kitchenPolylines; }, [kitchenPolylines]);

  const handleAddPolyline = useCallback((pl: KitchenPolyline) => {
    setPolylineUndoStack((prev) => [...prev.slice(-9), kitchenPolylinesRef.current]);
    setKitchenPolylines((prev) => [...prev, pl]);
  }, [setKitchenPolylines]);

  const handleDeletePolyline = useCallback((id: string) => {
    setPolylineUndoStack((prev) => [...prev.slice(-9), kitchenPolylinesRef.current]);
    setKitchenPolylines((prev) => prev.filter((p) => p.id !== id));
    setSelectedPolylineId(null);
  }, [setKitchenPolylines]);

  const handleUpdatePolylinePoints = useCallback((id: string, points: { x: number; y: number }[]) => {
    setKitchenPolylines((prev) => prev.map((p) => p.id === id ? { ...p, points } : p));
  }, [setKitchenPolylines]);

  const handleBeginPolylineEdit = useCallback(() => {
    setPolylineUndoStack((prev) => [...prev.slice(-9), kitchenPolylinesRef.current]);
  }, []);

  const handlePolylineUndo = useCallback(() => {
    setPolylineUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      setKitchenPolylines(restored);
      return prev.slice(0, -1);
    });
  }, [setKitchenPolylines]);

  const handleLeftPanelModeChange = useCallback((mode: LeftPanelMode) => {
    setLeftPanelMode(mode);
    if (mode === 'polyline') {
      // isEditingOutline は leftPanelMode === 'outline' の派生値 — setLeftPanelMode で自動解消
      setSelectedIds(new Set());
      setSelectedLineId(null);
      setSelectedPolylineId(null);
    } else {
      setSelectedPolylineId(null);
    }
  }, []);

  // Ctrl+Z for undo in outline edit mode
  const handleUndoRef = useRef(handleUndo);
  useEffect(() => { handleUndoRef.current = handleUndo; }, [handleUndo]);
  useEffect(() => {
    if (!isEditingOutline) return;
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndoRef.current(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isEditingOutline]);

  // 機器 Undo / Delete キー（アウトライン編集中は除外）
  const handleEquipUndoRef = useRef(handleEquipUndo);
  const handleDeleteSelectedRef = useRef(handleDeleteSelected);
  const handleRotateRightRef = useRef(handleRotateRight);
  const handleRotateLeftRef = useRef(handleRotateLeft);
  const handlePolylineUndoRef = useRef(handlePolylineUndo);
  useEffect(() => { handleEquipUndoRef.current = handleEquipUndo; }, [handleEquipUndo]);
  useEffect(() => { handleDeleteSelectedRef.current = handleDeleteSelected; }, [handleDeleteSelected]);
  useEffect(() => { handleRotateRightRef.current = handleRotateRight; }, [handleRotateRight]);
  useEffect(() => { handleRotateLeftRef.current = handleRotateLeft; }, [handleRotateLeft]);
  useEffect(() => { handlePolylineUndoRef.current = handlePolylineUndo; }, [handlePolylineUndo]);
  const leftPanelModeRef = useRef(leftPanelMode);
  useEffect(() => { leftPanelModeRef.current = leftPanelMode; }, [leftPanelMode]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement) return;
      if (isEditingOutline) return;
      // polyline mode: KitchenPolylineEditor handles Delete/Esc/Enter internally
      if (leftPanelModeRef.current === 'polyline') {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          handlePolylineUndoRef.current();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleEquipUndoRef.current();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelectedRef.current();
      }
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (e.shiftKey) handleRotateLeftRef.current();
        else handleRotateRightRef.current();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isEditingOutline]);

  // ── Shift+ドラッグ範囲選択 ───────────────────────────────────────────────
  const handleCanvasBgMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isEditingOutline || isSettingScale || isMappingMode || leftPanelModeRef.current === 'polyline') return;
    if (!e.shiftKey) {
      setSelectedIds(new Set());
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const startX = (e.clientX - rect.left) / canvasZoom;
    const startY = (e.clientY - rect.top) / canvasZoom;
    setDragSelect({ startX, startY, curX: startX, curY: startY });

    const snapshot = equipmentsRef.current;

    const onMove = (ev: MouseEvent) => {
      const curX = (ev.clientX - rect.left) / canvasZoom;
      const curY = (ev.clientY - rect.top) / canvasZoom;
      setDragSelect({ startX, startY, curX, curY });
    };
    const onUp = (ev: MouseEvent) => {
      const curX = (ev.clientX - rect.left) / canvasZoom;
      const curY = (ev.clientY - rect.top) / canvasZoom;
      const selLeft = Math.min(startX, curX);
      const selTop = Math.min(startY, curY);
      const selRight = Math.max(startX, curX);
      const selBottom = Math.max(startY, curY);
      if (selRight - selLeft > 4 || selBottom - selTop > 4) {
        const selected = new Set<string>();
        for (const eq of snapshot) {
          const eW = getDispW(eq);
          const eH = getDispH(eq);
          if (eq.x < selRight && eq.x + eW > selLeft && eq.y < selBottom && eq.y + eH > selTop) {
            selected.add(eq.id);
          }
        }
        setSelectedIds(selected);
      } else {
        setSelectedIds(new Set());
      }
      setDragSelect(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [isEditingOutline, isSettingScale, isMappingMode, canvasZoom]);

  // ── 図面マッピング ────────────────────────────────────────────────────────
  const handleStartMapping = useCallback(() => {
    const catalog = currentProject?.equipmentCatalog ?? ASTERA_CATALOG_DEFAULT;
    const detected = new Set<number>();
    for (const presetItem of ASTERA_PRESET.items) {
      const catEntry = catalog.find(c => c.no === presetItem.number);
      const expectedName = catEntry ? catalogDisplayName(catEntry) : presetItem.name;
      if (equipmentsRef.current.some((eq) => eq.name === expectedName)) {
        detected.add(presetItem.number);
      }
    }
    setMappedNumbers(detected);
    const firstUnplaced = ASTERA_PRESET.items.find((p) => !detected.has(p.number));
    setMappingItem(firstUnplaced ?? ASTERA_PRESET.items[0]);
    setIsMappingMode(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.equipmentCatalog]);

  const handleStopMapping = useCallback(() => {
    setIsMappingMode(false);
    setMappingItem(null);
    setMappingDrag(null);
  }, []);

  const handleSelectNextUnmapped = useCallback(() => {
    const first = ASTERA_PRESET.items.find((p) => !mappedNumbers.has(p.number));
    setMappingItem(first ?? null);
  }, [mappedNumbers]);

  const handleMappingNameEdit = useCallback((number: number, name: string) => {
    updateProject((prev) => ({
      mappingNames: { ...(prev.mappingNames ?? {}), [number]: name },
    }));
  }, [updateProject]);

  const handleCatalogSave = useCallback((catalog: CatalogItem[]) => {
    updateProject({ equipmentCatalog: catalog });
    setShowCatalogModal(false);
  }, [updateProject]);

  const handleMappingMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mappingItem) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const startX = (e.clientX - rect.left) / canvasZoom;
    const startY = (e.clientY - rect.top) / canvasZoom;
    setMappingDrag({ startX, startY, curX: startX, curY: startY });

    const onMove = (ev: MouseEvent) => {
      setMappingDrag({
        startX, startY,
        curX: (ev.clientX - rect.left) / canvasZoom,
        curY: (ev.clientY - rect.top) / canvasZoom,
      });
    };

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const curX = (ev.clientX - rect.left) / canvasZoom;
      const curY = (ev.clientY - rect.top) / canvasZoom;
      setMappingDrag(null);
      const w = Math.abs(curX - startX);
      const d = Math.abs(curY - startY);
      if (w < 10 || d < 10) return; // 小さすぎたらキャンセル

      const hasDuplicate = mappedNumbers.has(mappingItem.number);
      if (hasDuplicate) {
        if (!window.confirm(`「${mappingItem.name}」はすでに配置済みです。\n置き換えますか？`)) return;
      }
      pushEquipUndo();
      const x = Math.round(Math.min(startX, curX));
      const y = Math.round(Math.min(startY, curY));
      const catalog = currentProject?.equipmentCatalog ?? ASTERA_CATALOG_DEFAULT;
      const catEntry = catalog.find(c => c.no === mappingItem.number);
      const resolvedName = catEntry
        ? catalogDisplayName(catEntry)
        : (currentProject?.mappingNames?.[mappingItem.number] ?? mappingItem.name);
      const effectiveWidthMm = catEntry?.widthMm ?? mappingItem.widthMm;
      const effectiveDepthMm = catEntry?.depthMm ?? mappingItem.depthMm;
      const newItem: Equipment = {
        id: genId(), type: mappingItem.type, name: resolvedName,
        x, y,
        width: Math.round(w), depth: Math.round(d),
        displayWidth: Math.round(w), displayHeight: Math.round(d),
        widthMm: effectiveWidthMm, depthMm: effectiveDepthMm,
        rotation: 0, memo: '',
      };
      // 重なりチェック（重なる場合は配置不可）
      {
        const existingForCheck = hasDuplicate
          ? equipmentsRef.current.filter(e => e.name !== resolvedName)
          : equipmentsRef.current;
        if (existingForCheck.some(e => equipmentOverlap(newItem, e))) {
          window.alert(`「${newItem.name}」は既存の機器と重なるため配置できません。\n別の位置にドラッグしてください。`);
          return;
        }
      }
      setEquipments((prev) => {
        const filtered = hasDuplicate ? prev.filter((eq) => eq.name !== resolvedName) : prev;
        return [...filtered, newItem];
      });
      setSelectedIds(new Set([newItem.id]));
      const newMapped = new Set([...mappedNumbers, mappingItem.number]);
      setMappedNumbers(newMapped);
      const nextItem = ASTERA_PRESET.items.find(
        (p) => p.number > mappingItem.number && !newMapped.has(p.number),
      );
      setMappingItem(nextItem ?? null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [mappingItem, mappedNumbers, canvasZoom, currentProject?.mappingNames, currentProject?.equipmentCatalog, setEquipments, pushEquipUndo]);

  // Escape キーで図面マッピングモードをキャンセル
  useEffect(() => {
    if (!isMappingMode) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleStopMapping(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isMappingMode, handleStopMapping]);

  // ── right panel resize ───────────────────────────────────────────────────
  const handlePanelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightWidthRef.current;
    const onMove = (ev: MouseEvent) => {
      const dx = startX - ev.clientX; // drag left → wider
      setRightWidth(Math.max(250, Math.min(700, startW + dx)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // ── プリセット適用 ────────────────────────────────────────────────────────
  const buildPresetEquipments = (preset: KitchenPreset): Equipment[] =>
    preset.items.map((item) => ({
      id: genId(), type: item.type, name: item.name,
      x: item.x, y: item.y,
      width: item.width, depth: item.depth,
      displayWidth: item.width, displayHeight: item.depth,
      widthMm: item.widthMm, depthMm: item.depthMm,
      rotation: item.rotation, memo: item.memo ?? '',
    }));

  const handlePresetButtonClick = useCallback((preset: KitchenPreset) => {
    if (equipments.length === 0) {
      setEquipments(buildPresetEquipments(preset));
    } else {
      setPresetConfirm(preset);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipments.length, setEquipments]);

  const applyPreset = useCallback((action: 'add' | 'replace') => {
    if (!presetConfirm) return;
    const items = buildPresetEquipments(presetConfirm);
    if (action === 'replace') {
      setEquipments(items);
    } else {
      setEquipments((prev) => [...prev, ...items]);
    }
    setPresetConfirm(null);
  }, [presetConfirm, setEquipments]);

  // ── 縮尺設定 ──────────────────────────────────────────────────────────────
  // Escape キーで縮尺設定モードをキャンセル
  useEffect(() => {
    if (!isSettingScale) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsSettingScale(false); setScalePoint1(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isSettingScale]);

  const handleScaleSvgMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setScaleMousePos({
      x: (e.clientX - rect.left) / canvasZoom,
      y: (e.clientY - rect.top) / canvasZoom,
    });
  }, [canvasZoom]);

  const handleScaleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvasZoom;
    const y = (e.clientY - rect.top) / canvasZoom;

    if (!scalePoint1) {
      setScalePoint1({ x, y });
    } else {
      const dx = x - scalePoint1.x;
      const dy = y - scalePoint1.y;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      setScalePoint1(null);

      const input = window.prompt(
        `2点間の実際の距離を入力してください（mm 単位）\n計測: ${distPx.toFixed(1)} px`,
        '3600',
      );
      if (input !== null) {
        const mm = parseFloat(input.replace(',', '.'));
        if (!isNaN(mm) && mm > 0) {
          updateProject({ scalePxPerMm: distPx / mm });
          setIsSettingScale(false);
        }
      }
    }
  }, [scalePoint1, canvasZoom, updateProject]);

  // 全アイテムに実寸を反映（displayWidth / displayHeight のみ更新）
  const handleApplyRealDimsAll = useCallback(() => {
    const scale = currentProject?.scalePxPerMm;
    if (!scale) return;
    setEquipments((prev) => prev.map((eq) => {
      if (eq.widthMm != null && eq.depthMm != null) {
        return { ...eq, displayWidth: Math.round(eq.widthMm * scale), displayHeight: Math.round(eq.depthMm * scale) };
      }
      return eq;
    }));
  }, [currentProject?.scalePxPerMm, setEquipments]);

  // 単体アイテムに実寸を反映（RightPanel から呼ばれる）
  const handleApplyRealDimsSingle = useCallback((item: Equipment) => {
    const scale = currentProject?.scalePxPerMm;
    if (!scale || item.widthMm == null || item.depthMm == null) return;
    handleUpdate({
      ...item,
      displayWidth: Math.round(item.widthMm * scale),
      displayHeight: Math.round(item.depthMm * scale),
    });
  }, [currentProject?.scalePxPerMm, handleUpdate]);

  // ── export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!canvasRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(canvasRef.current, { scale: 1.5, useCORS: true });
    const link = document.createElement('a');
    link.download = `${currentProject?.name ?? 'kitchen-layout'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ── project management ────────────────────────────────────────────────────
  const handleNewProject = useCallback(async () => {
    const name = window.prompt('案件名を入力してください', '新規案件');
    if (name !== null && name.trim()) await createProject(name.trim());
  }, [createProject]);

  const handleDeleteProject = useCallback(async () => {
    if (!currentProject) return;
    if (!window.confirm(`「${currentProject.name}」を削除しますか？`)) return;
    await deleteProject(currentProject.id);
  }, [currentProject, deleteProject]);

  const handleRenameConfirm = useCallback(() => {
    if (nameInput.trim()) updateProject({ name: nameInput.trim() });
    setEditingName(false);
  }, [nameInput, updateProject]);

  // ── PDF management ────────────────────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    await uploadPdf(file);
    e.target.value = '';
  }, [uploadPdf]);

  const handlePageChange = useCallback((delta: number) => {
    if (!currentProject) return;
    const next = Math.max(1, Math.min(currentProject.pdfTotalPages, currentProject.pdfPageNumber + delta));
    updateProject({ pdfPageNumber: next });
  }, [currentProject, updateProject]);

  const handleTotalPages = useCallback((total: number) => {
    if (currentProject && total !== currentProject.pdfTotalPages) {
      updateProject({ pdfTotalPages: total });
    }
  }, [currentProject, updateProject]);

  // ── crop handlers ─────────────────────────────────────────────────────────
  const handleKitchenCropConfirm = useCallback((crop: CropRegion) => {
    updateProject({ kitchenCrop: crop });
    setCropMode(null);
    setPdfSize(null);
  }, [updateProject]);

  const handleEquipmentListCropConfirm = useCallback((crop: CropRegion) => {
    updateProject({ equipmentListCrop: crop, showEquipmentList: true });
    setCropMode(null);
  }, [updateProject]);

  // base dimensions (PDF render size, zoom-independent)
  const canvasBaseW = pdfSize ? pdfSize.w : 900;
  const canvasBaseH = pdfSize ? pdfSize.h : 700;
  // display dimensions (base × zoom)
  const canvasW = Math.round(canvasBaseW * canvasZoom);
  const canvasH = Math.round(canvasBaseH * canvasZoom);

  const resolvedCatalog: CatalogItem[] = currentProject?.equipmentCatalog ?? ASTERA_CATALOG_DEFAULT;

  const setCanvasZoom = useCallback((next: number) => {
    const clamped = Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next)) * 10) / 10;
    updateProject({ canvasZoom: clamped });
  }, [updateProject]);

  const btnStyle = (active = false, accent = '#444'): React.CSSProperties => ({
    padding: '5px 12px', background: active ? accent : '#444',
    color: active ? '#fff' : '#ccc',
    border: `1px solid ${active ? accent : '#666'}`,
    borderRadius: 4, cursor: 'pointer', fontSize: 12,
    fontWeight: active ? 700 : 400,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', background: '#e8e8e8' }}>

      {/* ── Header row 1: project management ─────────────────────────────── */}
      <div style={{ background: '#1a1a1a', color: '#fff', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#aaa', marginRight: 4 }}>案件:</span>

        <select
          value={currentProject?.id ?? ''}
          onChange={(e) => switchProject(e.target.value)}
          style={{ padding: '4px 6px', fontSize: 13, borderRadius: 3, border: '1px solid #555', background: '#333', color: '#fff', maxWidth: 180 }}
        >
          {projectList.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {editingName ? (
          <>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setEditingName(false); }}
              style={{ padding: '4px 6px', fontSize: 13, borderRadius: 3, border: '1px solid #555', background: '#333', color: '#fff', width: 160 }}
            />
            <button onClick={handleRenameConfirm} style={{ ...btnStyle(), fontSize: 12, padding: '4px 8px' }}>確定</button>
            <button onClick={() => setEditingName(false)} style={{ ...btnStyle(), fontSize: 12, padding: '4px 8px' }}>ｷｬﾝｾﾙ</button>
          </>
        ) : (
          <button
            onClick={() => { setNameInput(currentProject?.name ?? ''); setEditingName(true); }}
            style={{ ...btnStyle(), fontSize: 12, padding: '4px 8px' }}
          >名前変更</button>
        )}

        <button onClick={handleNewProject} style={{ ...btnStyle(), fontSize: 12, padding: '4px 8px', background: '#16a34a', borderColor: '#15803d', color: '#fff' }}>
          ＋新規案件
        </button>
        {projectList.length > 1 && (
          <button onClick={handleDeleteProject} style={{ ...btnStyle(), fontSize: 12, padding: '4px 8px', background: '#b91c1c', borderColor: '#991b1b', color: '#fff' }}>
            削除
          </button>
        )}

        <div style={{ width: 1, height: 20, background: '#444', margin: '0 4px' }} />

        {/* PDF management */}
        <span style={{ fontSize: 12, color: '#aaa' }}>PDF:</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ ...btnStyle(), fontSize: 12, padding: '4px 10px' }}
          title="PDFをアップロード"
        >
          {isLoadingPdf ? '読込中…' : (currentProject?.pdfFileName ? '再アップロード' : 'アップロード')}
        </button>
        <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />

        {currentProject?.pdfFileName && (
          <span style={{ fontSize: 11, color: '#888', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentProject.pdfFileName}>
            {currentProject.pdfFileName}
          </span>
        )}

        {pdfData && currentProject && currentProject.pdfTotalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => handlePageChange(-1)} disabled={currentProject.pdfPageNumber <= 1}
              style={{ ...btnStyle(), padding: '4px 8px', opacity: currentProject.pdfPageNumber <= 1 ? 0.4 : 1 }}>◀</button>
            <span style={{ fontSize: 12, color: '#ccc' }}>{currentProject.pdfPageNumber}/{currentProject.pdfTotalPages}</span>
            <button onClick={() => handlePageChange(1)} disabled={currentProject.pdfPageNumber >= currentProject.pdfTotalPages}
              style={{ ...btnStyle(), padding: '4px 8px', opacity: currentProject.pdfPageNumber >= currentProject.pdfTotalPages ? 0.4 : 1 }}>▶</button>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Crop buttons */}
        {pdfData && (
          <>
            <button
              onClick={() => setCropMode('kitchen')}
              style={{ ...btnStyle(!!currentProject?.kitchenCrop, '#0369a1'), fontSize: 12, padding: '4px 9px' }}
              title="厨房平面図の範囲を設定"
            >
              図面範囲{currentProject?.kitchenCrop ? ' ✓' : '設定'}
            </button>
            <button
              onClick={() => setCropMode('equipment-list')}
              style={{ ...btnStyle(!!currentProject?.equipmentListCrop, '#065f46'), fontSize: 12, padding: '4px 9px' }}
              title="機器リストの範囲を設定"
            >
              機器リスト範囲{currentProject?.equipmentListCrop ? ' ✓' : '設定'}
            </button>
          </>
        )}

        <div style={{ width: 1, height: 20, background: '#444', margin: '0 4px' }} />

        <button
          onClick={handleStartMapping}
          style={{ ...btnStyle(isMappingMode, '#0d9488'), fontSize: 12, padding: '4px 10px', background: isMappingMode ? '#0d9488' : '#0f766e', borderColor: '#0d9488', color: '#fff' }}
          title="リストから機器を選んで図面をクリックして配置"
        >
          図面マッピング{isMappingMode ? ' ON' : ''}
        </button>
        <button
          onClick={() => handlePresetButtonClick(ASTERA_PRESET)}
          style={{ ...btnStyle(), fontSize: 12, padding: '4px 10px', background: '#7c3aed', borderColor: '#6d28d9', color: '#fff' }}
          title="機器26点を図面上の見た目位置に初期配置（手動調整前提）"
        >
          簡易自動配置
        </button>
        <button
          onClick={() => setShowCatalogModal(true)}
          style={{ ...btnStyle(), fontSize: 12, padding: '4px 10px', background: '#0369a1', borderColor: '#0284c7', color: '#fff' }}
          title="案件ごとの機器一覧データを編集（名称・寸法）"
        >
          機器一覧編集
        </button>
        {equipments.length > 0 && (
          <button
            onClick={handleDeleteAll}
            style={{ ...btnStyle(), fontSize: 12, padding: '4px 10px', background: '#b91c1c', borderColor: '#991b1b', color: '#fff' }}
            title={`配置済み機器 ${equipments.length} 件をすべて削除`}
          >
            機器を全削除
          </button>
        )}
      </div>

      {/* ── Header row 2: display toggles + tools ────────────────────────── */}
      <div style={{ background: '#222', color: '#fff', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#ddd', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={showPdf} onChange={(e) => updateProject({ showPdf: e.target.checked })}
            style={{ width: 14, height: 14, accentColor: '#3b82f6' }} />
          厨房図面
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#ddd', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={showEquipmentList} onChange={(e) => updateProject({ showEquipmentList: e.target.checked })}
            style={{ width: 14, height: 14, accentColor: '#10b981' }} />
          機器リスト表示
        </label>

        <div style={{ width: 1, height: 18, background: '#444' }} />

        {/* 厨房図面ズームコントロール */}
        <span style={{ fontSize: 11, color: '#aaa' }}>図面ズーム:</span>
        <button
          onClick={() => setCanvasZoom(canvasZoom - ZOOM_STEP)}
          disabled={canvasZoom <= ZOOM_MIN}
          style={{ ...btnStyle(), padding: '4px 8px', opacity: canvasZoom <= ZOOM_MIN ? 0.4 : 1 }}
          title="縮小 (10%)"
        >−</button>
        <span style={{ fontSize: 13, color: '#fff', minWidth: 44, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(canvasZoom * 100)}%
        </span>
        <button
          onClick={() => setCanvasZoom(canvasZoom + ZOOM_STEP)}
          disabled={canvasZoom >= ZOOM_MAX}
          style={{ ...btnStyle(), padding: '4px 8px', opacity: canvasZoom >= ZOOM_MAX ? 0.4 : 1 }}
          title="拡大 (10%)"
        >+</button>
        <button
          onClick={() => setCanvasZoom(1.0)}
          style={{ ...btnStyle(canvasZoom === 1.0, '#3b82f6'), padding: '4px 8px', fontSize: 11 }}
          title="100%に戻す"
        >1:1</button>

        <div style={{ width: 1, height: 18, background: '#444' }} />

        {/* 機器スナップ */}
        <button
          onClick={() => setSnapEquipGrid((v) => !v)}
          style={btnStyle(snapEquipGrid, '#10b981')}
          title="機器移動・リサイズを10px単位に吸着"
        >
          スナップ{snapEquipGrid ? ' ON' : ''}
        </button>

        <div style={{ width: 1, height: 18, background: '#444' }} />

        {/* 縮尺設定 */}
        <button
          onClick={() => {
            if (isEditingOutline) setLeftPanelMode('equipment');
            setIsSettingScale((v) => !v);
            setScalePoint1(null);
          }}
          style={btnStyle(isSettingScale, '#dc2626')}
          title="図面上の2点をクリックして実寸を入力し縮尺を設定"
        >
          縮尺設定{isSettingScale ? ' ON' : ''}
        </button>
        {currentProject?.scalePxPerMm != null && !isSettingScale && (
          <span style={{ fontSize: 11, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}
            title="現在の縮尺">
            1mm={currentProject.scalePxPerMm.toFixed(3)}px
          </span>
        )}
        {currentProject?.scalePxPerMm != null && (() => {
          const count = equipments.filter((e) => e.widthMm != null && e.depthMm != null).length;
          return count > 0 ? (
            <button
              onClick={handleApplyRealDimsAll}
              style={{ ...btnStyle(), background: '#1d4ed8', borderColor: '#1e40af', color: '#fff', fontSize: 12 }}
              title={`実寸データを持つ ${count} 件のアイテムに縮尺を適用`}
            >
              実寸サイズ反映（{count}件）
            </button>
          ) : null;
        })()}

        <div style={{ width: 1, height: 18, background: '#444' }} />

        {equipUndoStack.length > 0 && (
          <button
            onClick={handleEquipUndo}
            style={{ ...btnStyle(), fontSize: 11, padding: '4px 8px' }}
            title="機器配置を1ステップ戻す (Ctrl+Z)"
          >
            機器Undo ({equipUndoStack.length})
          </button>
        )}
        <button onClick={handleExport} style={btnStyle()}>PNG出力</button>
        <button onClick={() => window.print()} style={btnStyle()}>印刷</button>
      </div>

      {/* ── 縮尺設定ツールバー ───────────────────────────────────────────── */}
      {isSettingScale && (
        <div style={{
          background: '#fff1f2', borderBottom: '1px solid #fecdd3',
          padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 14,
          flexShrink: 0, fontSize: 12, color: '#9f1239', flexWrap: 'wrap',
        }}>
          <span>
            {scalePoint1 ? '▶ 2点目をクリックしてください（Esc でキャンセル）' : '▶ 1点目をクリックしてください（Esc でキャンセル）'}
          </span>
          {currentProject?.scalePxPerMm != null && (
            <span style={{ color: '#666' }}>現在: 1mm = {currentProject.scalePxPerMm.toFixed(3)}px</span>
          )}
          <button
            onClick={() => { setIsSettingScale(false); setScalePoint1(null); }}
            style={{ padding: '2px 8px', fontSize: 11, cursor: 'pointer', border: '1px solid #fca5a5', borderRadius: 3, background: '#fff', color: '#9f1239' }}
          >
            キャンセル
          </button>
        </div>
      )}

      {/* ── 図面マッピングモード ヒントバー ──────────────────────────────── */}
      {isMappingMode && (
        <div style={{
          background: '#0c1a2e', borderBottom: '1px solid #1d4ed8',
          padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0, fontSize: 12, color: '#93c5fd', flexWrap: 'wrap',
        }}>
          {mappingItem
            ? (<span>▶ 配置中: <strong style={{ color: '#fff' }}>{mappingItem.name}</strong> — 図面上でドラッグして機器の範囲を囲む / Esc で終了</span>)
            : (<span>▶ 左のリストから機器を選択してください（Esc で終了）</span>)
          }
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#60a5fa' }}>
            {mappedNumbers.size} / {ASTERA_PRESET.items.length} 配置済み
          </span>
          <button
            onClick={handleStopMapping}
            style={{ fontSize: 11, padding: '2px 8px', background: 'none', border: '1px solid #60a5fa', borderRadius: 3, color: '#93c5fd', cursor: 'pointer' }}
          >
            終了
          </button>
        </div>
      )}

      {/* ── 重なり警告バナー ──────────────────────────────────────────────── */}
      {overlappingIds.size > 0 && (
        <div style={{
          background: '#fef2f2', borderBottom: '1px solid #fecaca',
          padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0, fontSize: 12, color: '#b91c1c',
        }}>
          <span>⚠ 重なっている機器があります（{overlappingIds.size}個）— 移動して解消してください</span>
        </div>
      )}

      {/* ── プリセット確認バナー ──────────────────────────────────────────── */}
      {presetConfirm && (
        <div style={{
          background: '#ede9fe', borderBottom: '1px solid #c4b5fd',
          padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0, fontSize: 13, color: '#3b0764', flexWrap: 'wrap',
        }}>
          <span>
            既存のアイテムが {equipments.length} 個あります。
            「{presetConfirm.label}」{presetConfirm.items.length} 点を：
          </span>
          <button
            onClick={() => applyPreset('add')}
            style={{ padding: '4px 14px', background: '#7c3aed', color: '#fff', border: '1px solid #6d28d9', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
          >
            追加する
          </button>
          <button
            onClick={() => applyPreset('replace')}
            style={{ padding: '4px 14px', background: '#b91c1c', color: '#fff', border: '1px solid #991b1b', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
          >
            置き換える
          </button>
          <button
            onClick={() => setPresetConfirm(null)}
            style={{ padding: '4px 14px', background: '#fff', color: '#555', border: '1px solid #bbb', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
          >
            キャンセル
          </button>
        </div>
      )}

      {/* ── Polyline draw toolbar ────────────────────────────────────────── */}
      {leftPanelMode === 'polyline' && (
        <div style={{ background: '#ecfdf5', borderBottom: '1px solid #6ee7b7', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, fontSize: 12, color: '#065f46', flexWrap: 'wrap' }}>
          <span>厨房枠線: クリック→頂点追加 ／ Enter or ダブルクリック→確定 ／ Shift=水平/垂直 ／ Esc=キャンセル ／ Delete=削除</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            太さ:
            <select value={currentStrokeWidth} onChange={(e) => setCurrentStrokeWidth(Number(e.target.value))} style={{ padding: '2px 4px', fontSize: 12 }}>
              {[1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>{w}px</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            色:
            <input type="color" value={currentColor} onChange={(e) => setCurrentColor(e.target.value)} style={{ width: 30, height: 20, padding: 0, border: '1px solid #bbb', cursor: 'pointer' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
            グリッドスナップ
          </label>
          <button onClick={handlePolylineUndo} disabled={polylineUndoStack.length === 0}
            style={{ padding: '2px 8px', fontSize: 12, cursor: polylineUndoStack.length === 0 ? 'default' : 'pointer', opacity: polylineUndoStack.length === 0 ? 0.5 : 1 }}>
            Undo ({polylineUndoStack.length})
          </button>
          {selectedPolylineId && (
            <button onClick={() => handleDeletePolyline(selectedPolylineId)}
              style={{ padding: '2px 8px', fontSize: 12, background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', cursor: 'pointer', borderRadius: 3 }}>
              選択を削除
            </button>
          )}
        </div>
      )}

      {/* ── Outline edit toolbar (旧 kitchenLine 1辺モード) — 停止済み ──── */}
      {/* {isEditingOutline && (...)} — polyline に一本化のため非表示 */}

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {isMappingMode ? (
          <MappingPanel
            preset={ASTERA_PRESET}
            mappedNumbers={mappedNumbers}
            activeItem={mappingItem}
            scalePxPerMm={currentProject?.scalePxPerMm}
            mappingNames={currentProject?.mappingNames ?? {}}
            catalog={resolvedCatalog}
            onSelect={setMappingItem}
            onSelectNext={handleSelectNextUnmapped}
            onNameEdit={handleMappingNameEdit}
            onExit={handleStopMapping}
          />
        ) : (
          <LeftPanel
            mode={leftPanelMode}
            onModeChange={(m) => {
              setLeftPanelMode(m);
            }}
            onAdd={handleAdd}
            polylineCount={kitchenPolylines.length}
            oldLineCount={kitchenLines.length}
            onClearOldLines={handleClearKitchenLines}
          />
        )}

        {/* Canvas */}
        <div
          style={{ flex: 1, overflow: 'auto', background: '#ccc', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 16 }}
          onClick={() => setSelectedIds(new Set())}
        >
          {!pdfData && !currentProject?.kitchenCrop && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              color: '#888', fontSize: 14, textAlign: 'center', pointerEvents: 'none', zIndex: 10,
            }}>
              PDFをアップロードして<br />厨房図面を表示できます
            </div>
          )}

          <div
            ref={canvasRef}
            style={{ position: 'relative', width: canvasW, height: canvasH, flexShrink: 0, background: '#fff' }}
            onMouseDown={handleCanvasBgMouseDown}
            onClick={(e) => e.stopPropagation()}
          >
            <PdfBackground
              pdfData={pdfData}
              pageNumber={currentProject?.pdfPageNumber ?? 1}
              cropRegion={currentProject?.kitchenCrop}
              visible={showPdf}
              onSizeReady={(w, h) => setPdfSize({ w, h })}
              onTotalPagesReady={handleTotalPages}
            />
            <KitchenLineEditor
              lines={kitchenLines}
              width={canvasW}
              height={canvasH}
              zoom={canvasZoom}
              editMode={false /* 旧描画停止: polyline に一本化 */}
              snapToGrid={snapToGrid}
              strokeWidth={currentStrokeWidth}
              color={currentColor}
              selectedLineId={selectedLineId}
              onSelectLine={handleSelectLine}
              onAddLine={handleAddLine}
              onDeleteLine={handleDeleteLine}
              onUpdateLine={handleUpdateLine}
              onBeginDrag={handleBeginDrag}
            />

            {equipments.map((eq) => {
              const mates = eq.groupId
                ? equipments.filter((e) => e.groupId === eq.groupId && e.id !== eq.id).map((e) => ({ id: e.id, x: e.x, y: e.y }))
                : [];
              return (
                <EquipmentItem
                  key={eq.id}
                  equipment={eq}
                  isSelected={selectedIds.has(eq.id)}
                  showResizeHandles={selectedIds.size === 1 && selectedIds.has(eq.id)}
                  canvasScale={canvasZoom}
                  groupMates={mates}
                  isOverlapping={overlappingIds.has(eq.id)}
                  onSelectItem={handleSelectItem}
                  onMove={handleMove}
                  onMoveMultiple={handleMoveMultiple}
                  onResize={handleResize}
                />
              );
            })}

            <KitchenPolylineEditor
              polylines={kitchenPolylines}
              width={canvasW}
              height={canvasH}
              zoom={canvasZoom}
              isActive={leftPanelMode === 'polyline'}
              snapToGrid={snapToGrid}
              strokeWidth={currentStrokeWidth}
              color={currentColor}
              selectedId={selectedPolylineId}
              onSelect={setSelectedPolylineId}
              onAdd={handleAddPolyline}
              onDelete={handleDeletePolyline}
              onUpdatePoints={handleUpdatePolylinePoints}
              onBeginEdit={handleBeginPolylineEdit}
            />

            {/* 縮尺測定 SVG オーバーレイ */}
            {isSettingScale && (
              <svg
                viewBox={`0 0 ${canvasBaseW} ${canvasBaseH}`}
                width={canvasW}
                height={canvasH}
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 500, cursor: 'crosshair' }}
                onMouseMove={handleScaleSvgMove}
                onMouseDown={handleScaleSvgClick}
              >
                {/* 計測線プレビュー */}
                {scalePoint1 && (
                  <>
                    <line
                      x1={scalePoint1.x} y1={scalePoint1.y}
                      x2={scaleMousePos.x} y2={scaleMousePos.y}
                      stroke="#ef4444" strokeWidth={2 / canvasZoom}
                      strokeDasharray={`${8 / canvasZoom} ${4 / canvasZoom}`}
                    />
                    <circle cx={scalePoint1.x} cy={scalePoint1.y} r={5 / canvasZoom} fill="#ef4444" />
                    <circle cx={scaleMousePos.x} cy={scaleMousePos.y} r={3 / canvasZoom} fill="#ef4444" fillOpacity={0.6} />
                  </>
                )}
                {/* 透明ヒットエリア */}
                <rect x={0} y={0} width={canvasBaseW} height={canvasBaseH} fill="transparent" />
              </svg>
            )}

            {/* 図面マッピング ドラッグオーバーレイ */}
            {isMappingMode && (
              <div
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: canvasW, height: canvasH,
                  zIndex: 600,
                  cursor: mappingItem ? 'crosshair' : 'not-allowed',
                }}
                onMouseDown={handleMappingMouseDown}
              />
            )}

            {/* マッピングドラッグ中の矩形プレビュー */}
            {mappingDrag && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(mappingDrag.startX, mappingDrag.curX) * canvasZoom,
                  top: Math.min(mappingDrag.startY, mappingDrag.curY) * canvasZoom,
                  width: Math.abs(mappingDrag.curX - mappingDrag.startX) * canvasZoom,
                  height: Math.abs(mappingDrag.curY - mappingDrag.startY) * canvasZoom,
                  border: '2px solid #0d9488',
                  background: 'rgba(13,148,136,0.18)',
                  pointerEvents: 'none',
                  zIndex: 601,
                  boxSizing: 'border-box',
                }}
              />
            )}

            {/* Shift+ドラッグ 範囲選択矩形 */}
            {dragSelect && (
              <div
                style={{
                  position: 'absolute',
                  left: Math.min(dragSelect.startX, dragSelect.curX) * canvasZoom,
                  top: Math.min(dragSelect.startY, dragSelect.curY) * canvasZoom,
                  width: Math.abs(dragSelect.curX - dragSelect.startX) * canvasZoom,
                  height: Math.abs(dragSelect.curY - dragSelect.startY) * canvasZoom,
                  border: '1.5px dashed #3b82f6',
                  background: 'rgba(59,130,246,0.08)',
                  pointerEvents: 'none',
                  zIndex: 400,
                  boxSizing: 'border-box',
                }}
              />
            )}

            {groupBox && (
              <div style={{
                position: 'absolute',
                left: groupBox.x * canvasZoom, top: groupBox.y * canvasZoom,
                width: groupBox.w * canvasZoom, height: groupBox.h * canvasZoom,
                border: `2px dashed ${selectedGroupIds.size === 1 ? '#f59e0b' : '#3b82f6'}`,
                borderRadius: 3, pointerEvents: 'none', zIndex: 200, boxSizing: 'border-box',
              }} />
            )}
          </div>
        </div>

        {/* ── 右カラム（リサイズハンドル + 編集パネル + 機器リスト） ──────── */}
        {(selectedIds.size > 0 || showEquipmentList) && (
          <>
            {/* ドラッグリサイズハンドル */}
            <div
              onMouseDown={handlePanelResizeStart}
              style={{
                width: 5, flexShrink: 0, cursor: 'ew-resize',
                background: '#c8c8c8', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#3b82f6'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#c8c8c8'; }}
              title="ドラッグで幅変更"
            />

            {/* 右カラム本体 */}
            <div style={{
              width: rightWidth, flexShrink: 0,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', background: '#f5f5f5',
            }}>
              {/* 機器編集パネル（選択時のみ、最大高さ制限付きでスクロール可） */}
              {selectedIds.size > 0 && (
                <div style={{
                  flexShrink: 0, overflowY: 'auto',
                  maxHeight: showEquipmentList ? 340 : '100%',
                  borderBottom: showEquipmentList ? '1px solid #ccc' : 'none',
                }}>
                  <RightPanel
                    equipment={singleSelected}
                    selectedCount={selectedIds.size}
                    canGroup={canGroup}
                    canUngroup={canUngroup}
                    scalePxPerMm={currentProject?.scalePxPerMm}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onGroup={handleGroup}
                    onUngroup={handleUngroup}
                    onApplyRealDims={handleApplyRealDimsSingle}
                    onRotateRight={handleRotateRight}
                    onRotateLeft={handleRotateLeft}
                    onAlign={handleAlign}
                  />
                </div>
              )}

              {/* 機器リストパネル（flex:1 で残り高さ全部） */}
              {showEquipmentList && (
                <EquipmentListPanel
                  pdfData={pdfData}
                  pageNumber={currentProject?.pdfPageNumber ?? 1}
                  cropRegion={currentProject?.equipmentListCrop}
                  onSetCrop={() => setCropMode('equipment-list')}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Equipment Catalog Modal ──────────────────────────────────────────── */}
      {showCatalogModal && (
        <EquipmentCatalogModal
          catalog={resolvedCatalog}
          onSave={handleCatalogSave}
          onClose={() => setShowCatalogModal(false)}
        />
      )}

      {/* ── PDF Crop Modal ─────────────────────────────────────────────────── */}
      {cropMode && pdfData && currentProject && (
        <PdfCropModal
          pdfData={pdfData}
          pageNumber={currentProject.pdfPageNumber}
          mode={cropMode}
          currentCrop={cropMode === 'kitchen' ? currentProject.kitchenCrop : currentProject.equipmentListCrop}
          onConfirm={cropMode === 'kitchen' ? handleKitchenCropConfirm : handleEquipmentListCropConfirm}
          onClear={() => {
            if (cropMode === 'kitchen') { updateProject({ kitchenCrop: undefined }); setPdfSize(null); }
            else updateProject({ equipmentListCrop: undefined });
            setCropMode(null);
          }}
          onClose={() => setCropMode(null)}
        />
      )}
    </div>
  );
}
