'use client';
import type { EquipmentType } from '@/types/equipment';

const EQUIPMENT_LIST: { type: EquipmentType; defaultWidth: number; defaultDepth: number }[] = [
  { type: '冷蔵庫', defaultWidth: 60, defaultDepth: 70 },
  { type: '冷凍庫', defaultWidth: 60, defaultDepth: 70 },
  { type: 'シンク', defaultWidth: 120, defaultDepth: 60 },
  { type: '作業台', defaultWidth: 120, defaultDepth: 60 },
  { type: 'コンロ', defaultWidth: 90, defaultDepth: 60 },
  { type: 'スチコン', defaultWidth: 85, defaultDepth: 90 },
  { type: '配膳台', defaultWidth: 120, defaultDepth: 60 },
  { type: 'ラック', defaultWidth: 60, defaultDepth: 45 },
  { type: 'その他', defaultWidth: 80, defaultDepth: 60 },
];

interface Props {
  onAdd: (type: EquipmentType, width: number, depth: number) => void;
}

export default function LeftPanel({ onAdd }: Props) {
  return (
    <div style={{ width: 160, background: '#f5f5f5', borderRight: '1px solid #ddd', padding: '12px 8px', overflowY: 'auto', flexShrink: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#222', borderBottom: '1px solid #ccc', paddingBottom: 6 }}>
        機器追加
      </div>
      {EQUIPMENT_LIST.map((item) => (
        <button
          key={item.type}
          onClick={() => onAdd(item.type, item.defaultWidth, item.defaultDepth)}
          style={{
            display: 'block',
            width: '100%',
            marginBottom: 6,
            padding: '7px 6px',
            background: '#fff',
            border: '1px solid #bbb',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            textAlign: 'left',
            color: '#222',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#e8e8e8'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
        >
          {item.type}
          <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.defaultWidth}×{item.defaultDepth}cm</div>
        </button>
      ))}
    </div>
  );
}
