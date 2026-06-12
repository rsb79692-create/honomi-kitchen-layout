'use client';
import { useState } from 'react';
import type { CatalogItem } from '@/types/catalog';
import { ASTERA_CATALOG_DEFAULT, circledNumber } from '@/data/catalog';

interface Props {
  catalog: CatalogItem[];
  onSave: (catalog: CatalogItem[]) => void;
  onClose: () => void;
}

export default function EquipmentCatalogModal({ catalog, onSave, onClose }: Props) {
  const [localCatalog, setLocalCatalog] = useState<CatalogItem[]>(() =>
    catalog.map(item => ({ ...item }))
  );

  const updateField = (no: number, field: keyof CatalogItem, value: string) => {
    setLocalCatalog(prev => prev.map(item => {
      if (item.no !== no) return item;
      if (field === 'widthMm' || field === 'depthMm' || field === 'heightMm') {
        const n = value === '' ? undefined : parseFloat(value);
        return { ...item, [field]: (n != null && !isNaN(n)) ? n : undefined };
      }
      return { ...item, [field]: value };
    }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: 'min(98vw, 1050px)', height: '85vh', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* ヘッダー */}
        <div style={{ padding: '10px 16px', background: '#1e293b', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', flex: 1 }}>機器一覧データ編集（案件ごとに保存）</span>
          <button onClick={() => setLocalCatalog(ASTERA_CATALOG_DEFAULT.map(i => ({ ...i })))}
            style={{ fontSize: 11, padding: '4px 10px', background: '#475569', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>
            アステラ初期値に戻す
          </button>
          <button onClick={onClose}
            style={{ fontSize: 11, padding: '4px 10px', background: '#475569', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer' }}>
            キャンセル
          </button>
          <button onClick={() => onSave(localCatalog)}
            style={{ fontSize: 11, padding: '4px 14px', background: '#2563eb', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            保存
          </button>
        </div>
        <div style={{ padding: '4px 16px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            ✎ 名称・寸法を正しく修正してください。図面マッピング時の図形名・寸法表示に使われます。
          </span>
        </div>
        {/* テーブル */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: '#1e293b', color: '#94a3b8', fontSize: 11, zIndex: 1 }}>
                <th style={{ width: 40, padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #334155' }}>番号</th>
                <th style={{ width: 180, padding: '6px 6px', textAlign: 'left', borderRight: '1px solid #334155' }}>名称</th>
                <th style={{ width: 70, padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #334155' }}>間口mm</th>
                <th style={{ width: 70, padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #334155' }}>奥行mm</th>
                <th style={{ width: 70, padding: '6px 4px', textAlign: 'center', borderRight: '1px solid #334155' }}>高さmm</th>
                <th style={{ width: 150, padding: '6px 6px', textAlign: 'left', borderRight: '1px solid #334155' }}>仕様/型番</th>
                <th style={{ padding: '6px 6px', textAlign: 'left' }}>メモ</th>
              </tr>
            </thead>
            <tbody>
              {localCatalog.map((item, idx) => {
                const rowBg = idx % 2 === 0 ? '#f8fafc' : '#fff';
                const cellStyle: React.CSSProperties = { padding: '3px 4px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #f1f5f9', verticalAlign: 'middle' };
                const inputStyle: React.CSSProperties = { width: '100%', padding: '2px 4px', border: '1px solid #e2e8f0', borderRadius: 2, fontSize: 12, boxSizing: 'border-box', background: 'transparent' };
                return (
                  <tr key={item.no} style={{ background: rowBg }}>
                    <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 700, color: '#1e40af', fontSize: 13, borderRight: '1px solid #e2e8f0' }}>
                      {circledNumber(item.no)}
                    </td>
                    <td style={cellStyle}>
                      <input style={inputStyle} value={item.name} onChange={e => updateField(item.no, 'name', e.target.value)} />
                    </td>
                    <td style={cellStyle}>
                      <input style={{ ...inputStyle, textAlign: 'right' }} type="number" value={item.widthMm ?? ''} onChange={e => updateField(item.no, 'widthMm', e.target.value)} />
                    </td>
                    <td style={cellStyle}>
                      <input style={{ ...inputStyle, textAlign: 'right' }} type="number" value={item.depthMm ?? ''} onChange={e => updateField(item.no, 'depthMm', e.target.value)} />
                    </td>
                    <td style={cellStyle}>
                      <input style={{ ...inputStyle, textAlign: 'right' }} type="number" value={item.heightMm ?? ''} onChange={e => updateField(item.no, 'heightMm', e.target.value)} />
                    </td>
                    <td style={cellStyle}>
                      <input style={inputStyle} value={item.spec ?? ''} onChange={e => updateField(item.no, 'spec', e.target.value)} />
                    </td>
                    <td style={{ ...cellStyle, borderRight: 'none' }}>
                      <input style={inputStyle} value={item.note ?? ''} onChange={e => updateField(item.no, 'note', e.target.value)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
