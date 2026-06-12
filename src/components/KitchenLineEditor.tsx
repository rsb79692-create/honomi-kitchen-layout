'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { KitchenLine } from '@/types/kitchenLine';

interface Props {
  lines: KitchenLine[];
  width: number;
  height: number;
  zoom?: number; // display zoom factor (default 1.0)
  editMode: boolean;
  snapToGrid: boolean;
  strokeWidth: number;
  color: string;
  selectedLineId: string | null;
  onSelectLine: (id: string | null) => void;
  onAddLine: (line: KitchenLine) => void;
  onDeleteLine: (id: string) => void;
  onUpdateLine: (id: string, changes: Partial<KitchenLine>) => void;
  onBeginDrag: () => void;
}

function snap(v: number, on: boolean): number {
  return on ? Math.round(v / 10) * 10 : v;
}

function shiftSnap(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number } {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  return dx >= dy ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
}

let lineIdCounter = Date.now();
const genLineId = () => String(++lineIdCounter);

export default function KitchenLineEditor({
  lines, width, height, zoom = 1, editMode, snapToGrid,
  strokeWidth, color, selectedLineId,
  onSelectLine, onAddLine, onDeleteLine, onUpdateLine, onBeginDrag,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [shiftHeld, setShiftHeld] = useState(false);

  // Stale closure protection for callbacks used in global event handlers
  const onUpdateLineRef = useRef(onUpdateLine);
  const onDeleteLineRef = useRef(onDeleteLine);
  const onSelectLineRef = useRef(onSelectLine);
  useEffect(() => { onUpdateLineRef.current = onUpdateLine; }, [onUpdateLine]);
  useEffect(() => { onDeleteLineRef.current = onDeleteLine; }, [onDeleteLine]);
  useEffect(() => { onSelectLineRef.current = onSelectLine; }, [onSelectLine]);

  // Drag state for endpoint dragging
  const dragState = useRef<{
    lineId: string;
    endpoint: 'start' | 'end';
  } | null>(null);

  const getSvgPos = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    // Divide by zoom to convert screen pixels → base coordinate space
    const rawX = (clientX - rect.left) / zoom;
    const rawY = (clientY - rect.top) / zoom;
    return { x: snap(rawX, snapToGrid), y: snap(rawY, snapToGrid) };
  }, [snapToGrid, zoom]);

  // Reset drawing state when editMode turns off
  useEffect(() => {
    if (!editMode) {
      setDrawingStart(null);
      dragState.current = null;
    }
  }, [editMode]);

  useEffect(() => {
    if (!editMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getSvgPos(e.clientX, e.clientY);
      setMousePos(pos);

      if (dragState.current) {
        const { lineId, endpoint } = dragState.current;
        if (endpoint === 'start') {
          onUpdateLineRef.current(lineId, { x1: pos.x, y1: pos.y });
        } else {
          onUpdateLineRef.current(lineId, { x2: pos.x, y2: pos.y });
        }
      }
    };

    const handleMouseUp = () => {
      dragState.current = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
      if (e.key === 'Escape') setDrawingStart(null);
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLineId) {
        onDeleteLineRef.current(selectedLineId);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [editMode, selectedLineId, getSvgPos]);

  const handleBgClick = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const pos = getSvgPos(e.clientX, e.clientY);
    if (drawingStart === null) {
      setDrawingStart(pos);
    } else {
      const endPos = shiftHeld ? shiftSnap(drawingStart, pos) : pos;
      onAddLine({
        id: genLineId(),
        x1: drawingStart.x,
        y1: drawingStart.y,
        x2: endPos.x,
        y2: endPos.y,
        strokeWidth,
        color,
      });
      setDrawingStart(null);
    }
  }, [drawingStart, shiftHeld, getSvgPos, onAddLine, strokeWidth, color]);

  const handleLineClick = useCallback((e: React.MouseEvent, lineId: string) => {
    e.stopPropagation();
    onSelectLine(lineId);
  }, [onSelectLine]);

  const handleEndpointMouseDown = useCallback((
    e: React.MouseEvent,
    lineId: string,
    endpoint: 'start' | 'end',
  ) => {
    e.stopPropagation();
    e.preventDefault();
    onBeginDrag();
    dragState.current = { lineId, endpoint };
    onSelectLine(lineId);
  }, [onBeginDrag, onSelectLine]);

  const previewEnd = drawingStart
    ? (shiftHeld ? shiftSnap(drawingStart, mousePos) : mousePos)
    : null;

  // viewBox fixes coordinate space to base dimensions; width/height scale it to display size
  const baseW = width / zoom;
  const baseH = height / zoom;

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
        pointerEvents: editMode ? 'all' : 'none',
        cursor: editMode ? 'crosshair' : 'default',
      }}
    >
      {/* Background hit area — uses base coordinate space (viewBox) */}
      {editMode && (
        <rect
          x={0}
          y={0}
          width={baseW}
          height={baseH}
          fill="transparent"
          onClick={handleBgClick}
        />
      )}

      {/* Existing lines */}
      {lines.map((line) => {
        const isSelected = line.id === selectedLineId;
        return (
          <g key={line.id}>
            {editMode && (
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="transparent"
                strokeWidth={14}
                strokeLinecap="round"
                style={{ cursor: 'pointer' }}
                onClick={(e) => handleLineClick(e, line.id)}
              />
            )}
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={isSelected ? '#3b82f6' : line.color}
              strokeWidth={line.strokeWidth}
              strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      })}

      {/* Endpoint handles for selected line */}
      {editMode && selectedLineId && (() => {
        const line = lines.find((l) => l.id === selectedLineId);
        if (!line) return null;
        return (
          <>
            <circle
              cx={line.x1}
              cy={line.y1}
              r={6}
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth={1.5}
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => handleEndpointMouseDown(e, line.id, 'start')}
            />
            <circle
              cx={line.x2}
              cy={line.y2}
              r={6}
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth={1.5}
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => handleEndpointMouseDown(e, line.id, 'end')}
            />
          </>
        );
      })()}

      {/* Preview line while drawing */}
      {editMode && drawingStart && previewEnd && (
        <>
          <line
            x1={drawingStart.x}
            y1={drawingStart.y}
            x2={previewEnd.x}
            y2={previewEnd.y}
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray="6 4"
            style={{ pointerEvents: 'none' }}
          />
          <circle
            cx={drawingStart.x}
            cy={drawingStart.y}
            r={4}
            fill="#f59e0b"
            style={{ pointerEvents: 'none' }}
          />
        </>
      )}
    </svg>
  );
}
