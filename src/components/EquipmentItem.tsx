'use client';
import { useRef } from 'react';
import type { Equipment } from '@/types/equipment';

interface Props {
  equipment: Equipment;
  isSelected: boolean;
  canvasScale: number;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}

export default function EquipmentItem({ equipment, isSelected, canvasScale, onSelect, onMove }: Props) {
  const dragStart = useRef<{ mouseX: number; mouseY: number; equipX: number; equipY: number } | null>(null);

  const displayWidth = equipment.rotation === 0 ? equipment.width : equipment.depth;
  const displayHeight = equipment.rotation === 0 ? equipment.depth : equipment.width;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(equipment.id);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      equipX: equipment.x,
      equipY: equipment.y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = (ev.clientX - dragStart.current.mouseX) / canvasScale;
      const dy = (ev.clientY - dragStart.current.mouseY) / canvasScale;
      onMove(equipment.id, dragStart.current.equipX + dx, dragStart.current.equipY + dy);
    };

    const handleMouseUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: equipment.x * canvasScale,
        top: equipment.y * canvasScale,
        width: displayWidth * canvasScale,
        height: displayHeight * canvasScale,
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.35)' : 'rgba(200, 200, 200, 0.45)',
          border: isSelected ? '2px solid #3b82f6' : '1.5px solid #555',
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
        <span style={{ fontSize: Math.max(8, 10 * canvasScale), color: '#444', textAlign: 'center' }}>
          {equipment.width}×{equipment.depth}cm
        </span>
      </div>
    </div>
  );
}
