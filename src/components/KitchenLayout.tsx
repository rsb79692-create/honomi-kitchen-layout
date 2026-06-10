'use client';
import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { Equipment, EquipmentType } from '@/types/equipment';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import EquipmentItem from './EquipmentItem';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';

const PdfBackground = dynamic(() => import('./PdfBackground'), { ssr: false });

let idCounter = Date.now();
const genId = () => String(++idCounter);

const CANVAS_SCALE = 1.0;

export default function KitchenLayout() {
  const [equipments, setEquipments] = useLocalStorage<Equipment[]>('kitchen-equipments', []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<{ w: number; h: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedEquipment = equipments.find((e) => e.id === selectedId) ?? null;

  const handleAdd = useCallback((type: EquipmentType, width: number, depth: number) => {
    const newItem: Equipment = {
      id: genId(),
      type,
      name: type,
      x: 100,
      y: 100,
      width,
      depth,
      rotation: 0,
      memo: '',
    };
    setEquipments([...equipments, newItem]);
    setSelectedId(newItem.id);
  }, [equipments, setEquipments]);

  const handleMove = useCallback((id: string, x: number, y: number) => {
    setEquipments(equipments.map((e) => e.id === id ? { ...e, x, y } : e));
  }, [equipments, setEquipments]);

  const handleUpdate = useCallback((updated: Equipment) => {
    setEquipments(equipments.map((e) => e.id === updated.id ? updated : e));
  }, [equipments, setEquipments]);

  const handleResize = useCallback((id: string, width: number, depth: number) => {
    setEquipments(equipments.map((e) => e.id === id ? { ...e, width, depth } : e));
  }, [equipments, setEquipments]);

  const handleDelete = useCallback((id: string) => {
    setEquipments(equipments.filter((e) => e.id !== id));
    setSelectedId(null);
  }, [equipments, setEquipments]);

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
        <span style={{ flex: 1 }} />
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

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <LeftPanel onAdd={handleAdd} />

        {/* Canvas area */}
        <div
          style={{ flex: 1, overflow: 'auto', background: '#ccc', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 16 }}
          onClick={() => setSelectedId(null)}
        >
          <div
            ref={canvasRef}
            style={{ position: 'relative', width: canvasW, height: canvasH, flexShrink: 0, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <PdfBackground onSizeReady={(w, h) => setPdfSize({ w, h })} />
            {equipments.map((eq) => (
              <EquipmentItem
                key={eq.id}
                equipment={eq}
                isSelected={eq.id === selectedId}
                canvasScale={CANVAS_SCALE}
                onSelect={setSelectedId}
                onMove={handleMove}
                onResize={handleResize}
              />
            ))}
          </div>
        </div>

        <RightPanel equipment={selectedEquipment} onUpdate={handleUpdate} onDelete={handleDelete} />
      </div>
    </div>
  );
}
