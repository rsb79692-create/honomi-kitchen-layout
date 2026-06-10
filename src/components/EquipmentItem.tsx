'use client';
import { useRef } from 'react';
import type { Equipment } from '@/types/equipment';

export const SCALE_CM_PER_PX = 1;

const MIN_CM = 30;
const HANDLE_SIZE = 8;

interface Props {
  equipment: Equipment;
  isSelected: boolean;
  showResizeHandles: boolean;
  canvasScale: number;
  groupMates: Array<{ id: string; x: number; y: number }>;
  onSelectItem: (id: string, additive: boolean) => void;
  onMove: (id: string, x: number, y: number) => void;
  onMoveMultiple: (moves: Array<{ id: string; x: number; y: number }>) => void;
  onResize: (id: string, width: number, depth: number) => void;
}

export default function EquipmentItem({
  equipment, isSelected, showResizeHandles, canvasScale,
  groupMates, onSelectItem, onMove, onMoveMultiple, onResize,
}: Props) {
  const moveStart = useRef<{ mouseX: number; mouseY: number; equipX: number; equipY: number } | null>(null);
  const resizeStart = useRef<{
    mouseX: number; mouseY: number;
    width: number; depth: number;
    rotation: 0 | 90;
    dir: 'right' | 'bottom' | 'corner';
  } | null>(null);

  const displayWidth = equipment.rotation === 0 ? equipment.width : equipment.depth;
  const displayHeight = equipment.rotation === 0 ? equipment.depth : equipment.width;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (resizeStart.current) return;
    e.stopPropagation();
    const additive = e.ctrlKey || e.shiftKey || e.metaKey;
    onSelectItem(equipment.id, additive);

    const matesSnapshot = groupMates.map(m => ({ ...m }));
    moveStart.current = { mouseX: e.clientX, mouseY: e.clientY, equipX: equipment.x, equipY: equipment.y };

    const onMoveHandler = (ev: MouseEvent) => {
      if (!moveStart.current) return;
      const dx = (ev.clientX - moveStart.current.mouseX) / canvasScale;
      const dy = (ev.clientY - moveStart.current.mouseY) / canvasScale;

      if (matesSnapshot.length > 0) {
        onMoveMultiple([
          { id: equipment.id, x: moveStart.current.equipX + dx, y: moveStart.current.equipY + dy },
          ...matesSnapshot.map(m => ({ id: m.id, x: m.x + dx, y: m.y + dy })),
        ]);
      } else {
        onMove(equipment.id, moveStart.current.equipX + dx, moveStart.current.equipY + dy);
      }
    };
    const onUp = () => {
      moveStart.current = null;
      window.removeEventListener('mousemove', onMoveHandler);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMoveHandler);
    window.addEventListener('mouseup', onUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, dir: 'right' | 'bottom' | 'corner') => {
    e.stopPropagation();
    e.preventDefault();
    onSelectItem(equipment.id, false);
    resizeStart.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      width: equipment.width, depth: equipment.depth,
      rotation: equipment.rotation,
      dir,
    };

    const onMoveHandler = (ev: MouseEvent) => {
      const s = resizeStart.current;
      if (!s) return;
      const dx = (ev.clientX - s.mouseX) / canvasScale;
      const dy = (ev.clientY - s.mouseY) / canvasScale;

      let newWidth = s.width;
      let newDepth = s.depth;

      if (dir === 'right' || dir === 'corner') {
        if (s.rotation === 0) {
          newWidth = Math.max(MIN_CM, Math.round(s.width + dx));
        } else {
          newDepth = Math.max(MIN_CM, Math.round(s.depth + dx));
        }
      }
      if (dir === 'bottom' || dir === 'corner') {
        if (s.rotation === 0) {
          newDepth = Math.max(MIN_CM, Math.round(s.depth + dy));
        } else {
          newWidth = Math.max(MIN_CM, Math.round(s.width + dy));
        }
      }

      onResize(equipment.id, newWidth, newDepth);
    };
    const onUp = () => {
      resizeStart.current = null;
      window.removeEventListener('mousemove', onMoveHandler);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMoveHandler);
    window.addEventListener('mouseup', onUp);
  };

  const ho = HANDLE_SIZE / 2;
  const pxW = displayWidth * canvasScale;
  const pxH = displayHeight * canvasScale;
  const smallBox = pxW < 80 || pxH < 40;

  const isGrouped = !!equipment.groupId;
  const borderColor = isSelected ? (isGrouped ? '#f59e0b' : '#3b82f6') : '#555';
  const borderWidth = isSelected ? '2px' : '1.5px';
  const bgColor = isSelected
    ? (isGrouped ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.35)')
    : 'rgba(200,200,200,0.45)';

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: equipment.x * canvasScale,
        top: equipment.y * canvasScale,
        width: pxW,
        height: pxH,
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: bgColor,
          border: `${borderWidth} solid ${borderColor}`,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <span style={{ fontSize: Math.max(9, 12 * canvasScale), fontWeight: 600, color: '#111', textAlign: 'center', padding: '2px', lineHeight: 1.2 }}>
          {equipment.name}
        </span>
        {!smallBox && (
          <span style={{ fontSize: Math.max(8, 10 * canvasScale), color: '#444', textAlign: 'center', lineHeight: 1.3 }}>
            {equipment.width} × {equipment.depth} cm
          </span>
        )}
      </div>

      {showResizeHandles && (
        <>
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
            style={{
              position: 'absolute',
              right: -ho,
              top: '50%',
              transform: 'translateY(-50%)',
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              background: '#3b82f6',
              border: '1.5px solid #fff',
              borderRadius: 1,
              cursor: 'ew-resize',
              zIndex: 10,
            }}
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
            style={{
              position: 'absolute',
              bottom: -ho,
              left: '50%',
              transform: 'translateX(-50%)',
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              background: '#3b82f6',
              border: '1.5px solid #fff',
              borderRadius: 1,
              cursor: 'ns-resize',
              zIndex: 10,
            }}
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'corner')}
            style={{
              position: 'absolute',
              bottom: -ho,
              right: -ho,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              background: '#3b82f6',
              border: '1.5px solid #fff',
              borderRadius: 1,
              cursor: 'nwse-resize',
              zIndex: 10,
            }}
          />
        </>
      )}
    </div>
  );
}
