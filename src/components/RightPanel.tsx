'use client';
import { useState, useEffect } from 'react';
import type { Equipment } from '@/types/equipment';

export type AlignMode = 'left' | 'right' | 'top' | 'bottom' | 'h-distribute' | 'v-distribute';

interface Props {
  equipment: Equipment | null;
  selectedCount: number;
  canGroup: boolean;
  canUngroup: boolean;
  scalePxPerMm?: number;
  onUpdate: (updated: Equipment) => void;
  onDelete: (id: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onApplyRealDims?: (item: Equipment) => void;
  onRotateRight: () => void;
  onRotateLeft: () => void;
  onAlign: (mode: AlignMode) => void;
}

export default function RightPanel({
  equipment, selectedCount, canGroup, canUngroup, scalePxPerMm,
  onUpdate, onDelete, onGroup, onUngroup, onApplyRealDims,
  onRotateRight, onRotateLeft, onAlign,
}: Props) {
  const [localName, setLocalName] = useState('');
  const [localMemo, setLocalMemo] = useState('');
  const [localWidthMm, setLocalWidthMm] = useState('');
  const [localDepthMm, setLocalDepthMm] = useState('');

  useEffect(() => {
    if (equipment) {
      setLocalName(equipment.name);
      setLocalMemo(equipment.memo);
      setLocalWidthMm(equipment.widthMm != null ? String(equipment.widthMm) : '');
      setLocalDepthMm(equipment.depthMm != null ? String(equipment.depthMm) : '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipment?.id]);

  if (selectedCount === 0) return null;

  const panelStyle: React.CSSProperties = {
    width: '100%', background: '#f5f5f5',
    padding: 12, boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#555', marginBottom: 2, display: 'block' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 6px', border: '1px solid #bbb', borderRadius: 3, fontSize: 13, boxSizing: 'border-box', marginBottom: 10 };
  const btnStyle: React.CSSProperties = { width: '100%', padding: '7px', borderRadius: 4, cursor: 'pointer', fontSize: 13, marginBottom: 6 };

  const rotateBtn: React.CSSProperties = {
    flex: 1, padding: '5px 6px', background: '#f0f0f0', border: '1px solid #bbb',
    borderRadius: 3, cursor: 'pointer', fontSize: 12, fontWeight: 600,
  };
  const alignBtn = (label: string, mode: AlignMode) => (
    <button
      key={mode}
      onClick={() => onAlign(mode)}
      style={{
        padding: '4px 0', background: '#eef', border: '1px solid #99c',
        borderRadius: 3, cursor: 'pointer', fontSize: 11, color: '#334',
      }}
    >
      {label}
    </button>
  );

  if (selectedCount > 1) {
    return (
      <div style={panelStyle}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#222', borderBottom: '1px solid #ccc', paddingBottom: 6 }}>
          {selectedCount}個 選択中
        </div>

        {/* 回転 */}
        <div style={{ fontSize: 11, color: '#555', marginBottom: 4, fontWeight: 600 }}>回転</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          <button onClick={onRotateLeft}  style={rotateBtn}>← 左90°</button>
          <button onClick={onRotateRight} style={rotateBtn}>右90° →</button>
        </div>

        {/* 整列 */}
        <div style={{ fontSize: 11, color: '#555', marginBottom: 4, fontWeight: 600 }}>整列</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 10 }}>
          {alignBtn('左揃え', 'left')}
          {alignBtn('上揃え', 'top')}
          {alignBtn('右揃え', 'right')}
          {alignBtn('下揃え', 'bottom')}
          {alignBtn('横等間隔', 'h-distribute')}
          {alignBtn('縦等間隔', 'v-distribute')}
        </div>

        <div style={{ borderTop: '1px solid #ddd', marginBottom: 8 }} />

        {canGroup && (
          <button onClick={onGroup} style={{ ...btnStyle, background: '#dbeafe', border: '1px solid #93c5fd', color: '#1d4ed8' }}>
            グループ化
          </button>
        )}
        {canUngroup && (
          <button onClick={onUngroup} style={{ ...btnStyle, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>
            グループ解除
          </button>
        )}
      </div>
    );
  }

  if (!equipment) return null;

  const handleUpdate = (changes: Partial<Equipment>) => onUpdate({ ...equipment, ...changes });

  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#222', borderBottom: '1px solid #ccc', paddingBottom: 6 }}>
        {equipment.type}
        {equipment.groupId && <span style={{ fontSize: 10, color: '#f59e0b', marginLeft: 6, fontWeight: 400 }}>グループ</span>}
      </div>

      <label style={labelStyle}>名前</label>
      <input style={inputStyle} value={localName} onChange={(e) => setLocalName(e.target.value)} onBlur={() => handleUpdate({ name: localName })} />

      <label style={labelStyle}>幅 (cm)</label>
      <input type="number" style={inputStyle} value={equipment.width} min={10} max={500} onChange={(e) => handleUpdate({ width: Number(e.target.value) })} />

      <label style={labelStyle}>奥行 (cm)</label>
      <input type="number" style={inputStyle} value={equipment.depth} min={10} max={500} onChange={(e) => handleUpdate({ depth: Number(e.target.value) })} />

      <label style={labelStyle}>回転</label>
      <select style={inputStyle} value={equipment.rotation} onChange={(e) => handleUpdate({ rotation: Number(e.target.value) as 0 | 90 | 180 | 270 })}>
        <option value={0}>0°</option>
        <option value={90}>90°</option>
        <option value={180}>180°</option>
        <option value={270}>270°</option>
      </select>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <button onClick={onRotateLeft}  style={rotateBtn}>← 左90°</button>
        <button onClick={onRotateRight} style={rotateBtn}>右90° →</button>
      </div>

      <label style={labelStyle}>位置 X</label>
      <input type="number" style={inputStyle} value={Math.round(equipment.x)} onChange={(e) => handleUpdate({ x: Number(e.target.value) })} />

      <label style={labelStyle}>位置 Y</label>
      <input type="number" style={inputStyle} value={Math.round(equipment.y)} onChange={(e) => handleUpdate({ y: Number(e.target.value) })} />

      <div style={{ borderTop: '1px solid #ddd', marginBottom: 10 }} />
      <label style={labelStyle}>実寸 幅 (mm)</label>
      <input
        type="number"
        style={inputStyle}
        value={localWidthMm}
        min={0}
        placeholder="例: 700"
        onChange={(e) => setLocalWidthMm(e.target.value)}
        onBlur={() => {
          const v = parseFloat(localWidthMm);
          handleUpdate({ widthMm: isNaN(v) || v <= 0 ? undefined : v });
        }}
      />
      <label style={labelStyle}>実寸 奥行 (mm)</label>
      <input
        type="number"
        style={inputStyle}
        value={localDepthMm}
        min={0}
        placeholder="例: 590"
        onChange={(e) => setLocalDepthMm(e.target.value)}
        onBlur={() => {
          const v = parseFloat(localDepthMm);
          handleUpdate({ depthMm: isNaN(v) || v <= 0 ? undefined : v });
        }}
      />
      {scalePxPerMm != null && equipment.widthMm != null && equipment.depthMm != null && onApplyRealDims && (
        <button
          onClick={() => onApplyRealDims(equipment)}
          style={{ ...btnStyle, background: '#dbeafe', border: '1px solid #93c5fd', color: '#1e40af', marginBottom: 10 }}
          title={`1mm = ${scalePxPerMm.toFixed(3)}px`}
        >
          縮尺を図形に適用
        </button>
      )}
      <label style={labelStyle}>メモ</label>
      <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={localMemo} onChange={(e) => setLocalMemo(e.target.value)} onBlur={() => handleUpdate({ memo: localMemo })} />

      {canUngroup && (
        <button onClick={onUngroup} style={{ ...btnStyle, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e' }}>
          グループ解除
        </button>
      )}
      <button onClick={() => onDelete(equipment.id)} style={{ ...btnStyle, background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', marginTop: 4 }}>
        削除
      </button>
    </div>
  );
}
