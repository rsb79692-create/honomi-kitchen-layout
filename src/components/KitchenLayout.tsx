'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Equipment, EquipmentType } from '@/types/equipment';
import type { KitchenLine } from '@/types/kitchenLine';
import type { CropRegion } from '@/types/project';
import { useProjects } from '@/hooks/useProjects';
import EquipmentItem from './EquipmentItem';
import KitchenLineEditor from './KitchenLineEditor';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';
import EquipmentListPanel from './EquipmentListPanel';

const PdfBackground = dynamic(() => import('./PdfBackground'), { ssr: false });
const PdfCropModal = dynamic(() => import('./PdfCropModal'), { ssr: false });

let idCounter = Date.now();
const genId = () => String(++idCounter);

const CANVAS_SCALE = 1.0;

type CropMode = 'kitchen' | 'equipment-list' | null;

export default function KitchenLayout() {
  const {
    projectList, currentProject, pdfData, isLoadingPdf,
    updateProject, switchProject, createProject, deleteProject, uploadPdf,
  } = useProjects();

  // Derive project fields
  const equipments: Equipment[] = currentProject?.equipments ?? [];
  const kitchenLines: KitchenLine[] = currentProject?.kitchenLines ?? [];
  const showPdf: boolean = currentProject?.showPdf ?? true;
  const showEquipmentList: boolean = currentProject?.showEquipmentList ?? false;

  // Local UI state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pdfSize, setPdfSize] = useState<{ w: number; h: number } | null>(null);
  const [isEditingOutline, setIsEditingOutline] = useState(false);
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

  // Reset selection when project changes
  const prevProjectId = useRef(currentProject?.id);
  useEffect(() => {
    if (currentProject?.id !== prevProjectId.current) {
      prevProjectId.current = currentProject?.id;
      setSelectedIds(new Set());
      setIsEditingOutline(false);
      setSelectedLineId(null);
      setUndoStack([]);
      setPdfSize(null);
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
    const rights = selectedEqs.map((e) => e.x + (e.rotation === 0 ? e.width : e.depth));
    const bottoms = selectedEqs.map((e) => e.y + (e.rotation === 0 ? e.depth : e.width));
    groupBox = {
      x: Math.min(...xs) - 4, y: Math.min(...ys) - 4,
      w: Math.max(...rights) - Math.min(...xs) + 8,
      h: Math.max(...bottoms) - Math.min(...ys) + 8,
    };
  }

  // ── equipment handlers ────────────────────────────────────────────────────
  const handleAdd = useCallback((type: EquipmentType, width: number, depth: number) => {
    const item: Equipment = { id: genId(), type, name: type, x: 100, y: 100, width, depth, rotation: 0, memo: '' };
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
    setEquipments((prev) => prev.map((e) => e.id === id ? { ...e, x, y } : e));
  }, [setEquipments]);

  const handleMoveMultiple = useCallback((moves: Array<{ id: string; x: number; y: number }>) => {
    const map = new Map(moves.map((m) => [m.id, m]));
    setEquipments((prev) => prev.map((e) => { const m = map.get(e.id); return m ? { ...e, x: m.x, y: m.y } : e; }));
  }, [setEquipments]);

  const handleUpdate = useCallback((updated: Equipment) => {
    setEquipments((prev) => prev.map((e) => e.id === updated.id ? updated : e));
  }, [setEquipments]);

  const handleResize = useCallback((id: string, width: number, depth: number) => {
    setEquipments((prev) => prev.map((e) => e.id === id ? { ...e, width, depth } : e));
  }, [setEquipments]);

  const handleDelete = useCallback((id: string) => {
    setEquipments((prev) => prev.filter((e) => e.id !== id));
    setSelectedIds(new Set());
  }, [setEquipments]);

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

  const handleStrokeWidthChange = useCallback((w: number) => {
    setCurrentStrokeWidth(w);
    if (selectedLineId) setKitchenLines((prev) => prev.map((l) => l.id === selectedLineId ? { ...l, strokeWidth: w } : l));
  }, [selectedLineId, setKitchenLines]);

  const handleColorChange = useCallback((c: string) => {
    setCurrentColor(c);
    if (selectedLineId) setKitchenLines((prev) => prev.map((l) => l.id === selectedLineId ? { ...l, color: c } : l));
  }, [selectedLineId, setKitchenLines]);

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

  const canvasW = pdfSize ? pdfSize.w : 900;
  const canvasH = pdfSize ? pdfSize.h : 700;

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

        <button
          onClick={() => { setIsEditingOutline((v) => !v); setSelectedLineId(null); }}
          style={btnStyle(isEditingOutline, '#f59e0b')}
        >
          厨房枠編集{isEditingOutline ? ' ON' : ''}
        </button>
        <button onClick={handleExport} style={btnStyle()}>PNG出力</button>
        <button onClick={() => window.print()} style={btnStyle()}>印刷</button>
      </div>

      {/* ── Outline edit toolbar ──────────────────────────────────────────── */}
      {isEditingOutline && (
        <div style={{ background: '#fefce8', borderBottom: '1px solid #fde047', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, fontSize: 12, color: '#713f12', flexWrap: 'wrap' }}>
          <span>クリックで線開始 → 次クリックで確定 ／ Shift=水平/垂直 ／ Esc=ｷｬﾝｾﾙ ／ Delete=削除</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            太さ:
            <select value={currentStrokeWidth} onChange={(e) => handleStrokeWidthChange(Number(e.target.value))} style={{ padding: '2px 4px', fontSize: 12 }}>
              {[1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>{w}px</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            色:
            <input type="color" value={currentColor} onChange={(e) => handleColorChange(e.target.value)} style={{ width: 30, height: 20, padding: 0, border: '1px solid #bbb', cursor: 'pointer' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
            グリッドスナップ
          </label>
          <button onClick={handleUndo} disabled={undoStack.length === 0}
            style={{ padding: '2px 8px', fontSize: 12, cursor: undoStack.length === 0 ? 'default' : 'pointer', opacity: undoStack.length === 0 ? 0.5 : 1 }}>
            Undo
          </button>
          {selectedLineId && (
            <button onClick={() => handleDeleteLine(selectedLineId)}
              style={{ padding: '2px 8px', fontSize: 12, background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', cursor: 'pointer', borderRadius: 3 }}>
              選択線を削除
            </button>
          )}
        </div>
      )}

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftPanel onAdd={handleAdd} />

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
                ? equipments.filter((e) => e.groupId === eq.groupId && e.id !== eq.id).map((e) => ({ id: e.id, x: e.x, y: e.y }))
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

            {groupBox && (
              <div style={{
                position: 'absolute',
                left: groupBox.x * CANVAS_SCALE, top: groupBox.y * CANVAS_SCALE,
                width: groupBox.w * CANVAS_SCALE, height: groupBox.h * CANVAS_SCALE,
                border: `2px dashed ${selectedGroupIds.size === 1 ? '#f59e0b' : '#3b82f6'}`,
                borderRadius: 3, pointerEvents: 'none', zIndex: 200, boxSizing: 'border-box',
              }} />
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

        {showEquipmentList && (
          <EquipmentListPanel
            pdfData={pdfData}
            pageNumber={currentProject?.pdfPageNumber ?? 1}
            cropRegion={currentProject?.equipmentListCrop}
            onSetCrop={() => setCropMode('equipment-list')}
          />
        )}
      </div>

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
