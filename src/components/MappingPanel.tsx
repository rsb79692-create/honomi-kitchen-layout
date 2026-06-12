'use client';
import type { KitchenPreset, PresetItem } from '@/data/presets';

interface Props {
  preset: KitchenPreset;
  mappedNumbers: Set<number>;
  activeItem: PresetItem | null;
  scalePxPerMm?: number;
  onSelect: (item: PresetItem) => void;
  onSelectNext: () => void;
  onExit: () => void;
}

export default function MappingPanel({
  preset, mappedNumbers, activeItem, scalePxPerMm, onSelect, onSelectNext, onExit,
}: Props) {
  const placedCount = mappedNumbers.size;
  const totalCount = preset.items.length;
  const allPlaced = placedCount >= totalCount;

  return (
    <div style={{
      width: 190, flexShrink: 0,
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
            : '縮尺未設定 → デフォルトサイズ'}
        </div>
      </div>

      {/* Usage hint */}
      <div style={{ padding: '5px 10px', background: '#0c1929', flexShrink: 0, borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
          ① リストで機器を選択<br />
          ② 図面上をクリックして配置
        </div>
      </div>

      {/* Item list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 4px' }}>
        {preset.items.map((item) => {
          const isPlaced = mappedNumbers.has(item.number);
          const isActive = activeItem?.number === item.number;

          return (
            <div
              key={item.number}
              onClick={() => onSelect(item)}
              title={`${item.name}  ${item.widthMm} × ${item.depthMm} mm`}
              style={{
                padding: '4px 7px',
                marginBottom: 2,
                borderRadius: 3,
                cursor: 'pointer',
                border: `1.5px solid ${isActive ? '#60a5fa' : 'transparent'}`,
                background: isActive
                  ? '#1d4ed8'
                  : isPlaced
                    ? 'rgba(34,197,94,0.12)'
                    : '#1e293b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, minWidth: 10, marginTop: 1,
                  color: isActive ? '#bfdbfe' : isPlaced ? '#86efac' : '#475569',
                }}>
                  {isPlaced ? '✓' : isActive ? '▶' : '·'}
                </span>
                <span style={{
                  fontSize: 11,
                  color: isActive ? '#fff' : isPlaced ? '#86efac' : '#cbd5e1',
                  lineHeight: 1.35,
                }}>
                  {item.name}
                </span>
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
            style={{
              fontSize: 11, padding: '4px 8px',
              background: '#1d4ed8', border: 'none',
              borderRadius: 3, color: '#fff', cursor: 'pointer',
            }}
            title="次の未配置アイテムを選択"
          >
            次の未配置へ ↓
          </button>
        )}
        <button
          onClick={onExit}
          style={{
            fontSize: 11, padding: '4px 8px',
            background: '#334155', border: 'none',
            borderRadius: 3, color: '#94a3b8', cursor: 'pointer',
          }}
        >
          マッピング終了
        </button>
      </div>
    </div>
  );
}
