'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { KitchenPolyline } from '@/types/kitchenPolyline';

let plIdCounter = Date.now() + 100;
const genPlId = () => String(++plIdCounter);

function snapVal(v: number, on: boolean) {
  return on ? Math.round(v / 10) * 10 : v;
}

function shiftConstrain(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number } {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  return dx >= dy ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
}

interface Props {
  polylines: KitchenPolyline[];
  width: number;
  height: number;
  zoom: number;
  isActive: boolean;
  snapToGrid: boolean;
  strokeWidth: number;
  color: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (polyline: KitchenPolyline) => void;
  onDelete: (id: string) => void;
  onUpdatePoints: (id: string, points: { x: number; y: number }[]) => void;
  onBeginEdit: () => void;
}

// Time window to treat two consecutive mousedowns as a double-click
const DBLCLICK_MS = 280;

export default function KitchenPolylineEditor({
  polylines, width, height, zoom, isActive, snapToGrid, strokeWidth, color,
  selectedId, onSelect, onAdd, onDelete, onUpdatePoints, onBeginEdit,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draftPoints, setDraftPoints] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [shiftHeld, setShiftHeld] = useState(false);

  // Stable refs — prevent stale closures in effects and handlers
  const onAddRef = useRef(onAdd);
  const onDeleteRef = useRef(onDelete);
  const onSelectRef = useRef(onSelect);
  const onUpdatePointsRef = useRef(onUpdatePoints);
  const onBeginEditRef = useRef(onBeginEdit);
  useEffect(() => { onAddRef.current = onAdd; }, [onAdd]);
  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onUpdatePointsRef.current = onUpdatePoints; }, [onUpdatePoints]);
  useEffect(() => { onBeginEditRef.current = onBeginEdit; }, [onBeginEdit]);

  const draftPointsRef = useRef(draftPoints);
  useEffect(() => { draftPointsRef.current = draftPoints; }, [draftPoints]);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  const polylinesRef = useRef(polylines);
  useEffect(() => { polylinesRef.current = polylines; }, [polylines]);
  const snapToGridRef = useRef(snapToGrid);
  useEffect(() => { snapToGridRef.current = snapToGrid; }, [snapToGrid]);
  const strokeWidthRef = useRef(strokeWidth);
  useEffect(() => { strokeWidthRef.current = strokeWidth; }, [strokeWidth]);
  const colorRef = useRef(color);
  useEffect(() => { colorRef.current = color; }, [color]);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const shiftHeldRef = useRef(shiftHeld);
  useEffect(() => { shiftHeldRef.current = shiftHeld; }, [shiftHeld]);

  // Timestamp of last mousedown — used to detect double-click second press
  const lastMouseDownMs = useRef(0);

  // Vertex drag state
  const vertexDrag = useRef<{ polylineId: string; index: number; hasSnapshot: boolean } | null>(null);

  // Stable coordinate converter (only reads refs → deps = [])
  const getSvgPos = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: snapVal((clientX - rect.left) / zoomRef.current, snapToGridRef.current),
      y: snapVal((clientY - rect.top) / zoomRef.current, snapToGridRef.current),
    };
  }, []);


  // Reset local state when mode turns off
  useEffect(() => {
    if (!isActive) {
      setDraftPoints([]);
      setShiftHeld(false);
      lastMouseDownMs.current = 0;
      vertexDrag.current = null;
    }
  }, [isActive]);

  // Global handlers: mouse preview + vertex drag + keyboard
  useEffect(() => {
    if (!isActive) return;

    const onMouseMove = (e: MouseEvent) => {
      const pos = getSvgPos(e.clientX, e.clientY);
      setMousePos(pos);

      if (vertexDrag.current) {
        if (!vertexDrag.current.hasSnapshot) {
          onBeginEditRef.current();
          vertexDrag.current.hasSnapshot = true;
        }
        const { polylineId, index } = vertexDrag.current;
        const poly = polylinesRef.current.find((p) => p.id === polylineId);
        if (poly) {
          const newPts = [...poly.points];
          newPts[index] = pos;
          onUpdatePointsRef.current(polylineId, newPts);
        }
      }
    };

    const onMouseUp = () => { vertexDrag.current = null; };

    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;

      if (e.key === 'Shift') { setShiftHeld(true); return; }

      if (e.key === 'Escape') {
        setDraftPoints([]);
        lastMouseDownMs.current = 0;
        return;
      }

      if (e.key === 'Enter') {
        const pts = draftPointsRef.current;
        if (pts.length >= 2) {
          onAddRef.current({ id: genPlId(), points: pts, strokeWidth: strokeWidthRef.current, color: colorRef.current });
          setDraftPoints([]);
          lastMouseDownMs.current = 0;
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && draftPointsRef.current.length === 0) {
        const sid = selectedIdRef.current;
        if (sid) { onDeleteRef.current(sid); onSelectRef.current(null); }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isActive, getSvgPos]);

  // --- Background rect: onMouseDown adds vertex ---
  // Uses timestamp to skip the 2nd mousedown of a double-click
  const handleBgMouseDown = (e: React.MouseEvent<SVGRectElement>) => {
    e.stopPropagation();

    const now = Date.now();
    const elapsed = now - lastMouseDownMs.current;
    lastMouseDownMs.current = now;

    if (elapsed < DBLCLICK_MS) return; // skip 2nd mousedown of dblclick

    const raw = getSvgPos(e.clientX, e.clientY);
    const pts = draftPointsRef.current;
    const last = pts.length > 0 ? pts[pts.length - 1] : null;
    const pos = shiftHeldRef.current && last ? shiftConstrain(last, raw) : raw;

    setDraftPoints((prev) => [...prev, pos]);
    onSelectRef.current(null);
  };

  // --- Background rect: onDoubleClick confirms draft ---
  const handleBgDblClick = (e: React.MouseEvent<SVGRectElement>) => {
    e.stopPropagation();
    const pts = draftPointsRef.current;
    if (pts.length >= 2) {
      onAddRef.current({ id: genPlId(), points: pts, strokeWidth: strokeWidthRef.current, color: colorRef.current });
      setDraftPoints([]);
      lastMouseDownMs.current = 0;
    }
  };

  const handlePolylineClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (draftPointsRef.current.length === 0) onSelect(id);
  };

  const handleVertexMouseDown = (e: React.MouseEvent, polylineId: string, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (draftPointsRef.current.length > 0) return;
    vertexDrag.current = { polylineId, index, hasSnapshot: false };
    onSelect(polylineId);
  };

  const baseW = width / zoom;
  const baseH = height / zoom;
  const lastDraft = draftPoints.length > 0 ? draftPoints[draftPoints.length - 1] : null;
  const previewPt = isActive && lastDraft ? (shiftHeld ? shiftConstrain(lastDraft, mousePos) : mousePos) : null;
  const toSvgPts = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${baseW} ${baseH}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: isActive ? 400 : 1,
        pointerEvents: isActive ? 'all' : 'none',
        cursor: isActive ? 'crosshair' : 'default',
      }}
      // Stop all mousedowns inside SVG from reaching the parent canvas div
      onMouseDown={isActive ? (e) => e.stopPropagation() : undefined}
    >
      {/* "Enter で確定" hint — visible when 2+ draft points exist */}
      {isActive && draftPoints.length >= 2 && (
        <text
          x={baseW / 2} y={baseH - 12}
          fontSize={13} fill="#1d4ed8"
          textAnchor="middle"
          style={{ pointerEvents: 'none', fontFamily: 'sans-serif', fontWeight: 'bold' }}
        >
          {`${draftPoints.length}点 — Enter で確定 / Esc でキャンセル`}
        </text>
      )}

      {/* Full-canvas background hit area — only when active */}
      {isActive && (
        <rect
          x={0} y={0}
          width={baseW} height={baseH}
          fill="transparent"
          style={{ pointerEvents: 'all', cursor: 'crosshair' }}
          onMouseDown={handleBgMouseDown}
          onDoubleClick={handleBgDblClick}
        />
      )}

      {/* Existing polylines */}
      {polylines.map((pl) => {
        const isSelected = pl.id === selectedId;
        const pts = toSvgPts(pl.points);
        return (
          <g key={pl.id}>
            {/* Wide transparent stroke for easy selection */}
            <polyline
              points={pts}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ cursor: draftPoints.length === 0 ? 'pointer' : 'crosshair' }}
              onClick={(e) => handlePolylineClick(e, pl.id)}
            />
            {/* Visible polyline */}
            <polyline
              points={pts}
              fill="none"
              stroke={isSelected ? '#3b82f6' : pl.color}
              strokeWidth={pl.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      })}

      {/* Vertex handles for selected polyline (not while mid-draw) */}
      {selectedId && draftPoints.length === 0 && (() => {
        const pl = polylines.find((p) => p.id === selectedId);
        if (!pl) return null;
        return pl.points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x} cy={pt.y} r={6}
            fill="#3b82f6" stroke="#fff" strokeWidth={1.5}
            style={{ cursor: 'grab' }}
            onMouseDown={(e) => handleVertexMouseDown(e, selectedId, i)}
          />
        ));
      })()}

      {/* In-progress draft polyline */}
      {isActive && draftPoints.length > 0 && (
        <>
          <polyline
            points={toSvgPts(draftPoints)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="8 4"
            style={{ pointerEvents: 'none' }}
          />
          {draftPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x} cy={pt.y}
              r={i === 0 ? 5 : 3}
              fill={i === 0 ? '#f59e0b' : color}
              style={{ pointerEvents: 'none' }}
            />
          ))}
        </>
      )}

      {/* Preview segment: last draft point → cursor */}
      {isActive && lastDraft && previewPt && (
        <line
          x1={lastDraft.x} y1={lastDraft.y}
          x2={previewPt.x} y2={previewPt.y}
          stroke="#f59e0b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray="6 4"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  );
}
