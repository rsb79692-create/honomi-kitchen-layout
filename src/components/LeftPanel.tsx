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

// 'outline' = 旧 KitchenLine 1辺ずつ編集モード（ツールバーボタン経由で設定）
export type LeftPanelMode = 'equipment' | 'polyline' | 'outline';

interface Props {
  mode: LeftPanelMode;
  onModeChange: (mode: LeftPanelMode) => void;
  onAdd: (type: EquipmentType, width: number, depth: number) => void;
  polylineCount: number;
  oldLineCount: number;
  onClearOldLines: () => void;
}

export default function LeftPanel({ mode, onModeChange, onAdd, polylineCount, oldLineCount, onClearOldLines }: Props) {
  const tabBase: React.CSSProperties = {
    flex: 1,
    padding: '7px 4px',
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'background 0.1s',
  };
  const tabActive: React.CSSProperties = {
    ...tabBase,
    background: '#fff',
    color: '#1a1a1a',
    borderBottom: '2px solid #f59e0b',
  };
  const tabInactive: React.CSSProperties = {
    ...tabBase,
    background: '#e8e8e8',
    color: '#555',
  };

  // 'outline' は toolbar button 管理 — 左パネルでは '機器配置' を active に見せる
  const equipActive = mode === 'equipment' || mode === 'outline';

  return (
    <div style={{ width: 160, background: '#f5f5f5', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Mode tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
        <button
          style={equipActive ? tabActive : tabInactive}
          onClick={() => onModeChange('equipment')}
        >
          機器配置
        </button>
        <button
          style={mode === 'polyline' ? tabActive : tabInactive}
          onClick={() => onModeChange('polyline')}
        >
          厨房枠線
        </button>
      </div>

      {/* Panel body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {mode === 'polyline' ? (
          <>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#222', borderBottom: '1px solid #ccc', paddingBottom: 5 }}>
              厨房枠線
            </div>
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.7, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, color: '#333', marginBottom: 4 }}>1本直線:</div>
              <div style={{ paddingLeft: 8, marginBottom: 6 }}>
                <div>① クリック → 始点</div>
                <div>② クリック → 終点</div>
                <div>③ Enter → 確定</div>
              </div>
              <div style={{ fontWeight: 600, color: '#333', marginBottom: 4 }}>連続線:</div>
              <div style={{ paddingLeft: 8, marginBottom: 6 }}>
                <div>クリックで頂点追加</div>
                <div>ダブルクリック → 最終点 & 確定</div>
                <div>Enter → 確定（点を追加しない）</div>
              </div>
              <div>● Shift → 水平/垂直固定</div>
              <div>● Esc → キャンセル</div>
              <div>● 頂点ドラッグ → 頂点編集</div>
              <div>● クリック選択 → Delete で削除</div>
            </div>
            <div style={{ fontSize: 11, color: '#888', borderTop: '1px solid #ddd', paddingTop: 8 }}>
              描画済み: <strong style={{ color: '#333' }}>{polylineCount}</strong> 本
            </div>
            {oldLineCount > 0 && (
              <div style={{ marginTop: 10, padding: '8px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: '#92400e', marginBottom: 6 }}>
                  旧線分 {oldLineCount} 本が残っています
                </div>
                <button
                  onClick={onClearOldLines}
                  style={{ width: '100%', padding: '5px 4px', fontSize: 11, background: '#b45309', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}
                >
                  旧線分を全削除
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: '#222', borderBottom: '1px solid #ccc', paddingBottom: 5 }}>
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
          </>
        )}
      </div>
    </div>
  );
}
