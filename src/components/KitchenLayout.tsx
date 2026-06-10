'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Equipment, EquipmentType } from '@/types/equipment';
import type { KitchenLine } from '@/types/kitchenLine';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import EquipmentItem from './EquipmentItem';
import KitchenLineEditor from './KitchenLineEditor';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';

const PdfBackground = dynamic(() => import('./PdfBackground'), { ssr: false });

let idCounter = Date.now();
const genId = () => String(++idCounter);

const CANVAS_SCALE = 1.0;

export default function KitchenLayout() {
  const [equipments, setEquipments] = useLocalStorage<Equipment[]>('kitchen-equipments', []);
  const [showPdf, setShowPdf] = useLocalStorage<boolean>('kitchen-show-pdf', true);
  const [kitchenLines, setKitchenLines] = useLocalStorage<KitchenLine[]>('kitchen-outline-lines', []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pdfSize, setPdfSize] = useState<{ w: number; h: number } | null>(null);
  const [isEditingOutline, setIsEditingOutline] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2);
  const [currentColor, setCurrentColor] = useState('#1a1a1a');
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<KitchenLine[][]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── derived ──────────────────────────────────────────────────────────────
  const selectedEqs = equipments.filter((e) => selectedIds.has(e.id));
  const singleSelected = selectedIds.size === 1 ? selectedEqs[0] ?? null : null;

  const selectedGroupIds = new Set(selectedEqs.map((e) => e.groupId).filter(Boolean) as string[]);
  const canGroup = selectedIds.size >= 2;
  const canUngroup = selectedEqs.some((e) => !!e.groupId);

  // bounding box for group overlay (shown when 2+ items selected)
  let groupBox: { x: number; y: number; w: number; h: number } | null = null;
  if (selectedEqs.length >= 2) {
    const xs = selectedEqs.map((e) => e.x);
    const ys = selectedEqs.map((e) => e.y);
    const rights = selectedEqs.map((e) => e.x + (e.rotation === 0 ? e.width : e.depth));
    const bottoms = selectedEqs.map((e) => e.y + (e.rotation === 0 ? e.depth : e.width));
    groupBox = {
      x: Math.min(...xs) - 4,
      y: Math.min(...ys) - 4,
      w: Math.max(...rights) - Math.min(...xs) + 8,
      h: Math.max(...bottoms) - Math.min(...ys) + 8,
    };
  }

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleAdd = useCallback((type: EquipmentType, width: number, depth: number) => {
    const newItem: Equipment = {
      id: genId(), type, name: type, x: 100, y: 100,
      width, depth, rotation: 0, memo: '',
    };
    setEquipments((prev) => [...prev, newItem]);
    setSelectedIds(new Set([newItem.id]));
  }, [setEquipments]);

  const handleSelectItem = useCallback((id: string, additive: boolean) => {
    const eq = equipments.find((e) => e.id === id);
    const gid = eq?.groupId;
    const toSelect = gid
      ? equipments.filter((e) => e.groupId === gid).map((e) => e.id)
      : [id];

    if (additive) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const allAlreadySelected = toSelect.every((sid) => next.has(sid));
        if (allAlreadySelected) {
          toSelect.forEach((sid) => next.delete(sid));
        } else {
          toSelect.forEach((sid) => next.add(sid));
        }
        return next;
      });
    } else {
      setSelectedIds(new Set(toSelect));
    }
  }, [equipments]);

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setEquipments((prev) => prev.map((e) => (e.id === id ? { ...e, x, y } : e)));
  }, [setEquipments]);

  const handleMoveMultiple = useCallback((moves: Array<{ id: string; x: number; y: number }>) => {
    const moveMap = new Map(moves.map((m) => [m.id, m]));
    setEquipments((prev) =>
      prev.map((e) => {
        const m = moveMap.get(e.id);
        return m ? { ...e, x: m.x, y: m.y } : e;
      })
    );
  }, [setEquipments]);

  const handleUpdate = useCallback((updated: Equipment) => {
    setEquipments((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, [setEquipments]);

  const handleResize = useCallback((id: string, width: number, depth: number) => {
    setEquipments((prev) => prev.map((e) => (e.id === id ? { ...e, width, depth } : e)));
  }, [setEquipments]);

  const handleDelete = useCallback((id: string) => {
    setEquipments((prev) => prev.filter((e) => e.id !== id));
    setSelectedIds(new Set());
  }, [setEquipments]);

  const handleGroup = useCallback(() => {
    if (selectedIds.size < 2) return;
    const newGroupId = genId();
    const ids = selectedIds;
    setEquipments((prev) => prev.map((e) => (ids.has(e.id) ? { ...e, groupId: newGroupId } : e)));
  }, [selectedIds, setEquipments]);

  const handleUngroup = useCallback(() => {
    const ids = selectedIds;
    setEquipments((prev) => {
      // Find all groupIds of selected items, then ungroup all members of those groups
      const groupIdsToBreak = new Set(
        prev.filter((e) => ids.has(e.id) && e.groupId).map((e) => e.groupId as string)
      );
      return prev.map((e) =>
        (ids.has(e.id) || (e.groupId && groupIdsToBreak.has(e.groupId)))
          ? { ...e, groupId: undefined }
          : e
      );
    });
  }, [selectedIds, setEquipments]);

  const handleSelectLine = useCallback((id: string | null) => {
    setSelectedLineId(id);
    if (id) {
      const line = kitchenLines.find((l) => l.id === id);
      if (line) {
        setCurrentStrokeWidth(line.strokeWidth);
        setCurrentColor(line.color);
      }
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

  const handleStrokeWidthChange = useCallback((w: number) => {
    setCurrentStrokeWidth(w);
    if (selectedLineId) {
      setKitchenLines((prev) => prev.map((l) => l.id === selectedLineId ? { ...l, strokeWidth: w } : l));
    }
  }, [selectedLineId, setKitchenLines]);

  const handleColorChange = useCallback((c: string) => {
    setCurrentColor(c);
    if (selectedLineId) {
      setKitchenLines((prev) => prev.map((l) => l.id === selectedLineId ? { ...l, color: c } : l));
    }
  }, [selectedLineId, setKitchenLines]);

  const handleUndoRef = useRef(handleUndo);
  useEffect(() => { handleUndoRef.current = handleUndo; }, [handleUndo]);

  useEffect(() => {
    if (!isEditingOutline) return;
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndoRef.current();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isEditingOutline]);

  const handleExport = async () => {
    if (!canvasRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(canvasRef.current, { scale: 1.5, useCORS: true });
    const link = document.createElement('a');
    link.download = 'kitchen-layout.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => window.print();

  const canvasW = pdfSize ? pdfSize.w : 900;
  const canvasH = pdfSize ? pdfSize.h : 700;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', background: '#e8e8e8' }}>
      {/* Header */}
      <div style={{ background: '#222', color: '#fff', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>厨房レイアウト</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#ddd', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={showPdf}
            onChange={(e) => setShowPdf(e.target.checked)}
            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#3b82f6' }}
          />
          厨房図面を表示
        </label>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => {
            setIsEditingOutline((v) => !v);
            setSelectedLineId(null);
          }}
          style={{
            padding: '5px 14px',
            background: isEditingOutline ? '#f59e0b' : '#444',
            color: isEditingOutline ? '#000' : '#fff',
            border: `1px solid ${isEditingOutline ? '#d97706' : '#666'}`,
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: isEditingOutline ? 700 : 400,
          }}
        >
          厨房枠編集{isEditingOutline ? ' ON' : ''}
        </button>
        <button
          onClick={handleExport}
          style={{ padding: '5px 14px', background: '#444', color: '#fff', border: '1px solid #666', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
        >
          PNG出力
        </button>
        <button
          onClick={handlePrint}
          style={{ padding: '5px 14px', background: '#444', color: '#fff', border: '1px solid #666', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
        >
          印刷
        </button>
      </div>

      {isEditingOutline && (
        <div style={{
          background: '#fefce8', borderBottom: '1px solid #fde047',
          padding: '5px 16px', display: 'flex', alignItems: 'center',
          gap: 16, flexShrink: 0, fontSize: 12, color: '#713f12',
        }}>
          <span>クリックで線を開始 → 次のクリックで確定 ／ Shiftで水平/垂直固定 ／ Escでキャンセル ／ 線クリックで選択 ／ Deleteで削除</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            太さ:
            <select
              value={currentStrokeWidth}
              onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
              style={{ padding: '2px 4px', fontSize: 12 }}
            >
              {[1, 2, 3, 4, 5].map((w) => (
                <option key={w} value={w}>{w}px</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            色:
            <input
              type="color"
              value={currentColor}
              onChange={(e) => handleColorChange(e.target.value)}
              style={{ width: 32, height: 22, padding: 0, border: '1px solid #bbb', cursor: 'pointer' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
            />
            グリッドスナップ(10px)
          </label>
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            style={{ padding: '2px 10px', fontSize: 12, cursor: undoStack.length === 0 ? 'default' : 'pointer', opacity: undoStack.length === 0 ? 0.5 : 1 }}
          >
            Undo
          </button>
          {selectedLineId && (
            <button
              onClick={() => handleDeleteLine(selectedLineId)}
              style={{ padding: '2px 10px', fontSize: 12, background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', cursor: 'pointer', borderRadius: 3 }}
            >
              選択線を削除
            </button>
          )}
        </div>
      )}

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftPanel onAdd={handleAdd} />

        {/* Canvas area */}
        <div
          style={{ flex: 1, overflow: 'auto', background: '#ccc', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 16 }}
          onClick={() => setSelectedIds(new Set())}
        >
          <div
            ref={canvasRef}
            style={{ position: 'relative', width: canvasW, height: canvasH, flexShrink: 0, background: '#fff' }}
            onClick={(e) => e.stopPropagation()}
          >
            <PdfBackground onSizeReady={(w, h) => setPdfSize({ w, h })} visible={showPdf} />
            <KitchenLineEditor
              lines={kitchenLines}
              width={canvasW}
              height={canvasH}
              editMode={isEditingOutline}
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
                ? equipments
                    .filter((e) => e.groupId === eq.groupId && e.id !== eq.id)
                    .map((e) => ({ id: e.id, x: e.x, y: e.y }))
                : [];

              return (
                <EquipmentItem
                  key={eq.id}
                  equipment={eq}
                  isSelected={selectedIds.has(eq.id)}
                  showResizeHandles={selectedIds.size === 1 && selectedIds.has(eq.id)}
                  canvasScale={CANVAS_SCALE}
                  groupMates={mates}
                  onSelectItem={handleSelectItem}
                  onMove={handleMove}
                  onMoveMultiple={handleMoveMultiple}
                  onResize={handleResize}
                />
              );
            })}

            {/* Group bounding box overlay */}
            {groupBox && (
              <div
                style={{
                  position: 'absolute',
                  left: groupBox.x * CANVAS_SCALE,
                  top: groupBox.y * CANVAS_SCALE,
                  width: groupBox.w * CANVAS_SCALE,
                  height: groupBox.h * CANVAS_SCALE,
                  border: `2px dashed ${selectedGroupIds.size === 1 ? '#f59e0b' : '#3b82f6'}`,
                  borderRadius: 3,
                  pointerEvents: 'none',
                  zIndex: 200,
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        </div>

        <RightPanel
          equipment={singleSelected}
          selectedCount={selectedIds.size}
          canGroup={canGroup}
          canUngroup={canUngroup}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
        />
      </div>
    </div>
  );
}
