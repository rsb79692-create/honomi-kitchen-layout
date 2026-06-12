'use client';
import { useState, useRef, useEffect } from 'react';
import type { KitchenPreset, PresetItem } from '@/data/presets';

interface Props {
  preset: KitchenPreset;
  mappedNumbers: Set<number>;
  activeItem: PresetItem | null;
  scalePxPerMm?: number;
  mappingNames: Record<number, string>;
  onSelect: (item: PresetItem) => void;
  onSelectNext: () => void;
  onNameEdit: (number: number, name: string) => void;
  onExit: () => void;
}

export default function MappingPanel({
  preset, mappedNumbers, activeItem, scalePxPerMm,
  mappingNames, onSelect, onSelectNext, onNameEdit, onExit,
}: Props) {
  const placedCount = mappedNumbers.size;
  const totalCount = preset.items.length;
  const allPlaced = placedCount >= totalCount;

  const [editingNumber, setEditingNumber] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingNumber !== null) inputRef.current?.focus();
  }, [editingNumber]);

  const resolveName = (item: PresetItem) => mappingNames[item.number] ?? item.name;

  const startEdit = (e: React.MouseEvent, item: PresetItem) => {
    e.stopPropagation();
    setEditingNumber(item.number);
    setEditValue(resolveName(item));
  };

  const commitEdit = () => {
    if (editingNumber !== null && editValue.trim()) {
      onNameEdit(editingNumber, editValue.trim());
    }
    setEditingNumber(null);
  };

  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: '#0f172a',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      borderRight: '1px solid #1e293b',
    }}>
      {/* Header */}
      <div style={{ padding: '8px 10px', background: '#020617', flexShrink: 0, borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>図面マッピング</span>
          <button
            onClick={onExit}
            style={{ fontSize: 10, color: '#94a3b8', background: '#1e293b', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 3 }}
          >
            終了
          </button>
        </div>
        <div style={{ fontSize: 11, color: allPlaced ? '#22c55e' : '#94a3b8' }}>
          {placedCount} / {totalCount} 配置済み
        </div>
        <div style={{ fontSize: 10, marginTop: 2, color: scalePxPerMm != null ? '#22c55e' : '#f59e0b' }}>
          {scalePxPerMm != null
            ? `縮尺あり: 1mm=${scalePxPerMm.toFixed(2)}px`
            : '縮尺未設定'}
        </div>
      </div>

      {/* Usage hint */}
      <div style={{ padding: '5px 10px', background: '#0c1929', flexShrink: 0, borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
          ① 機器を選択<br />
          ② 図面上でドラッグして範囲を囲む<br />
          <span style={{ color: '#475569' }}>名前の ✎ で機器名を修正可能</span>
        </div>
      </div>

      {/* Item list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 4px' }}>
        {preset.items.map((item) => {
          const isPlaced = mappedNumbers.has(item.number);
          const isActive = activeItem?.number === item.number;
          const displayName = resolveName(item);
          const isEditing = editingNumber === item.number;
          const isOverridden = !!mappingNames[item.number] && mappingNames[item.number] !== item.name;

          return (
            <div
              key={item.number}
              onClick={() => !isEditing && onSelect(item)}
              title={`${displayName}  ${item.widthMm} × ${item.depthMm} mm`}
              style={{
                padding: '4px 6px',
                marginBottom: 2,
                borderRadius: 3,
                cursor: isEditing ? 'default' : 'pointer',
                border: `1.5px solid ${isActive ? '#60a5fa' : 'transparent'}`,
                background: isActive
                  ? '#1d4ed8'
                  : isPlaced
                    ? 'rgba(34,197,94,0.12)'
                    : '#1e293b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* status icon */}
                <span style={{
                  fontSize: 9, fontWeight: 700, minWidth: 10, flexShrink: 0,
                  color: isActive ? '#bfdbfe' : isPlaced ? '#86efac' : '#475569',
                }}>
                  {isPlaced ? '✓' : isActive ? '▶' : '·'}
                </span>

                {/* name area */}
                {isEditing ? (
                  <div style={{ flex: 1, display: 'flex', gap: 3 }} onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                        if (e.key === 'Escape') setEditingNumber(null);
                      }}
                      onBlur={commitEdit}
                      style={{
                        flex: 1, fontSize: 11, padding: '1px 4px',
                        border: '1px solid #60a5fa', borderRadius: 2,
                        background: '#0f172a', color: '#fff', minWidth: 0,
                      }}
                    />
                    <button
                      onMouseDown={(e) => { e.preventDefault(); commitEdit(); }}
                      style={{ fontSize: 9, padding: '1px 4px', background: '#0d9488', border: 'none', borderRadius: 2, color: '#fff', cursor: 'pointer', flexShrink: 0 }}
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 11,
                        color: isActive ? '#fff' : isPlaced ? '#86efac' : '#cbd5e1',
                        lineHeight: 1.35,
                        wordBreak: 'break-all',
                      }}>
                        {displayName}
                        {isOverridden && (
                          <span style={{ fontSize: 8, color: '#60a5fa', marginLeft: 3 }}>*</span>
                        )}
                      </div>
                      {item.subName && (
                        <div style={{ fontSize: 9, color: '#475569', lineHeight: 1.3 }}>
                          （{item.subName}）
                        </div>
                      )}
                    </div>
                    {/* edit button */}
                    <button
                      onClick={(e) => startEdit(e, item)}
                      title="名前を修正"
                      style={{
                        fontSize: 9, padding: '1px 3px', flexShrink: 0,
                        background: 'none', border: '1px solid #334155',
                        borderRadius: 2, color: '#475569', cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      ✎
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '6px 8px', borderTop: '1px solid #1e293b', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {allPlaced ? (
          <div style={{ fontSize: 11, color: '#22c55e', textAlign: 'center', padding: '4px 0' }}>
            全アイテム配置完了！
          </div>
        ) : (
          <button
            onClick={onSelectNext}
            style={{ fontSize: 11, padding: '4px 8px', background: '#1d4ed8', border: 'none', borderRadius: 3, color: '#fff', cursor: 'pointer' }}
            title="次の未配置アイテムを選択"
          >
            次の未配置へ ↓
          </button>
        )}
        <button
          onClick={onExit}
          style={{ fontSize: 11, padding: '4px 8px', background: '#334155', border: 'none', borderRadius: 3, color: '#94a3b8', cursor: 'pointer' }}
        >
          マッピング終了
        </button>
      </div>
    </div>
  );
}
