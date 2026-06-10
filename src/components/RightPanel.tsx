'use client';
import { useState, useEffect } from 'react';
import type { Equipment } from '@/types/equipment';

interface Props {
  equipment: Equipment | null;
  onUpdate: (updated: Equipment) => void;
  onDelete: (id: string) => void;
}

export default function RightPanel({ equipment, onUpdate, onDelete }: Props) {
  const [localName, setLocalName] = useState('');
  const [localMemo, setLocalMemo] = useState('');

  useEffect(() => {
    if (equipment) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalName(equipment.name); setLocalMemo(equipment.memo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment?.id]);

  if (!equipment) {
    return (
      <div style={{ width: 200, background: '#f5f5f5', borderLeft: '1px solid #ddd', padding: 12, flexShrink: 0, color: '#888', fontSize: 13 }}>
        機器を選択してください
      </div>
    );
  }

  const handleUpdate = (changes: Partial<Equipment>) => {
    onUpdate({ ...equipment, ...changes });
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#555', marginBottom: 2, display: 'block' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 6px', border: '1px solid #bbb', borderRadius: 3, fontSize: 13, boxSizing: 'border-box', marginBottom: 10 };
  const numberStyle: React.CSSProperties = { ...inputStyle, width: '100%' };

  return (
    <div style={{ width: 200, background: '#f5f5f5', borderLeft: '1px solid #ddd', padding: 12, overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#222', borderBottom: '1px solid #ccc', paddingBottom: 6 }}>
        {equipment.type}
      </div>

      <label style={labelStyle}>名前</label>
      <input
        style={inputStyle}
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={() => handleUpdate({ name: localName })}
      />

      <label style={labelStyle}>幅 (cm)</label>
      <input
        type="number"
        style={numberStyle}
        value={equipment.width}
        min={10}
        max={500}
        onChange={(e) => handleUpdate({ width: Number(e.target.value) })}
      />

      <label style={labelStyle}>奥行 (cm)</label>
      <input
        type="number"
        style={numberStyle}
        value={equipment.depth}
        min={10}
        max={500}
        onChange={(e) => handleUpdate({ depth: Number(e.target.value) })}
      />

      <label style={labelStyle}>回転</label>
      <select
        style={inputStyle}
        value={equipment.rotation}
        onChange={(e) => handleUpdate({ rotation: Number(e.target.value) as 0 | 90 })}
      >
        <option value={0}>0°</option>
        <option value={90}>90°</option>
      </select>

      <label style={labelStyle}>位置 X</label>
      <input
        type="number"
        style={numberStyle}
        value={Math.round(equipment.x)}
        onChange={(e) => handleUpdate({ x: Number(e.target.value) })}
      />

      <label style={labelStyle}>位置 Y</label>
      <input
        type="number"
        style={numberStyle}
        value={Math.round(equipment.y)}
        onChange={(e) => handleUpdate({ y: Number(e.target.value) })}
      />

      <label style={labelStyle}>メモ</label>
      <textarea
        style={{ ...inputStyle, height: 70, resize: 'vertical' }}
        value={localMemo}
        onChange={(e) => setLocalMemo(e.target.value)}
        onBlur={() => handleUpdate({ memo: localMemo })}
      />

      <button
        onClick={() => onDelete(equipment.id)}
        style={{
          width: '100%',
          padding: '7px',
          background: '#fee2e2',
          border: '1px solid #f87171',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13,
          color: '#b91c1c',
          marginTop: 4,
        }}
      >
        削除
      </button>
    </div>
  );
}
