import type { EquipmentType } from '@/types/equipment';

export interface PresetItem {
  number: number;
  name: string;     // 機器一覧表と一致させる正式名（案件ごとに上書き可能）
  subName?: string; // 補足メモ（例: "下処理用"）
  type: EquipmentType;
  x: number;        // 図面上の見た目位置 x (canvas px)
  y: number;        // 図面上の見た目位置 y (canvas px)
  width: number;    // 図面上の見た目サイズ 幅 (canvas px, ≈ widthMm/10)
  depth: number;    // 図面上の見た目サイズ 奥行 (canvas px, ≈ depthMm/10)
  widthMm: number;  // 機器一覧表の実寸 幅 (mm)
  depthMm: number;  // 機器一覧表の実寸 奥行 (mm)
  rotation: 0 | 90 | 180 | 270;
  memo?: string;
}

export interface KitchenPreset {
  id: string;
  label: string;
  items: PresetItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// アステラ新築厨房 機器番号①〜㉖
//
// ・x / y / width / depth = 図面上の見た目位置・サイズ（1px ≈ 10mm 基準）
//   → すべて canvas 約 660×510px の範囲内に収まります
// ・widthMm / depthMm = 機器一覧表の外形実寸（mm）
//   → 縮尺設定後に「実寸サイズ反映」で width / depth へ反映
//
// ※ 図面に合わせて各アイテムの x / y を手動調整してください
// ─────────────────────────────────────────────────────────────────────────────
export const ASTERA_PRESET: KitchenPreset = {
  id: 'astera-2024',
  label: 'アステラ新築厨房（①〜㉖）',
  items: [
    // ── 上段（y=20）: 衛生・下処理・冷蔵ゾーン ─────────────────────────────
    // ①〜⑦を横一列。最大 x+w ≈ 650
    { number: 1,  name: '① 手洗いシンク',                    type: 'シンク',   x: 20,  y: 20,  width: 45,  depth: 45,  widthMm: 450,  depthMm: 450,  rotation: 0 },
    { number: 2,  name: '② 冷凍冷蔵庫',                       type: '冷蔵庫',  x: 75,  y: 20,  width: 120, depth: 60,  widthMm: 1200, depthMm: 600,  rotation: 0 },
    { number: 3,  name: '③ 戸棚',                            type: 'その他',  x: 205, y: 20,  width: 120, depth: 60,  widthMm: 1200, depthMm: 600,  rotation: 0 },
    { number: 4,  name: '④ 検食用冷凍ストッカー',             type: '冷凍庫',  x: 335, y: 20,  width: 90,  depth: 60,  widthMm: 1200, depthMm: 600,  rotation: 0 },
    { number: 5,  name: '⑤ 炊飯台',                          type: 'その他',  x: 435, y: 20,  width: 65,  depth: 70,  widthMm: 750,  depthMm: 700,  rotation: 0 },
    { number: 6,  name: '⑥ IHジャー炊飯器',                 type: 'その他',  x: 510, y: 20,  width: 65,  depth: 70,  widthMm: 750,  depthMm: 700,  rotation: 0 },
    { number: 7,  name: '⑦ IHジャー炊飯器',                 type: 'その他',  x: 585, y: 20,  width: 65,  depth: 75,  widthMm: 900,  depthMm: 750,  rotation: 0 },

    // ── 2段目（y=140）: ラック + 加熱調理ゾーン ────────────────────────────
    { number: 8,  name: '⑧ 二槽シンク',                       type: 'シンク',   x: 20,  y: 140, width: 55,  depth: 45,  widthMm: 600,  depthMm: 450,  rotation: 0 },
    { number: 9,  name: '⑨ 台下戸棚',                         type: 'その他',  x: 85,  y: 140, width: 100, depth: 60,  widthMm: 1200, depthMm: 600,  rotation: 0 },
    { number: 10, name: '⑩ テーブル形冷凍庫',                 type: '冷凍庫',  x: 195, y: 130, width: 70,  depth: 85,  widthMm: 700,  depthMm: 590,  rotation: 0 },
    { number: 11, name: '⑪ ブリクサー',                       type: 'その他',  x: 275, y: 135, width: 75,  depth: 75,  widthMm: 850,  depthMm: 800,  rotation: 0 },
    { number: 12, name: '⑫ 膳台',                            type: '配膳台',  x: 360, y: 140, width: 45,  depth: 60,  widthMm: 450,  depthMm: 600,  rotation: 0 },
    { number: 13, name: '⑬ ガステーブル',                     type: 'コンロ',  x: 415, y: 140, width: 100, depth: 60,  widthMm: 1500, depthMm: 600,  rotation: 0 },
    { number: 14, name: '⑭ 作業台',                           type: '作業台',  x: 525, y: 140, width: 60,  depth: 70,  widthMm: 750,  depthMm: 700,  rotation: 0 },
    { number: 15, name: '⑮ ガススチームコンベクションオーブン', type: 'スチコン', x: 595, y: 140, width: 55,  depth: 45,  widthMm: 600,  depthMm: 450,  rotation: 0 },

    // ── 3段目（y=295）: 中央作業テーブル ────────────────────────────────────
    { number: 16, name: '⑯ 電子レンジ',                       type: 'その他',  x: 20,  y: 305, width: 45,  depth: 45,  widthMm: 450,  depthMm: 450,  rotation: 0 },
    { number: 17, name: '⑰ テーブル形冷蔵庫',                 type: '冷蔵庫',  x: 75,  y: 295, width: 150, depth: 70,  widthMm: 1800, depthMm: 800,  rotation: 0 },
    { number: 18, name: '⑱ 電子ジャー',                       type: 'その他',  x: 235, y: 295, width: 150, depth: 70,  widthMm: 1800, depthMm: 800,  rotation: 0 },
    { number: 19, name: '⑲ マイコンスープジャー',             type: 'その他',  x: 395, y: 295, width: 100, depth: 60,  widthMm: 1200, depthMm: 600,  rotation: 0 },
    { number: 20, name: '⑳ ジャー置台',                       type: 'その他',  x: 505, y: 295, width: 55,  depth: 45,  widthMm: 600,  depthMm: 450,  rotation: 0 },

    // ── 下段（y=430）: 配膳・食器洗浄ゾーン ─────────────────────────────────
    { number: 21, name: '㉑ 二槽シンク',                       type: 'シンク',   x: 20,  y: 430, width: 55,  depth: 60,  widthMm: 600,  depthMm: 650,  rotation: 0 },
    { number: 22, name: '㉒ 食器洗浄機',                       type: 'その他',  x: 85,  y: 430, width: 120, depth: 55,  widthMm: 1500, depthMm: 600,  rotation: 0 },
    { number: 23, name: '㉓ パイプ棚',                         type: 'ラック',  x: 215, y: 430, width: 120, depth: 55,  widthMm: 1500, depthMm: 600,  rotation: 0 },
    { number: 24, name: '㉔ 包丁まな板消毒保管機',             type: 'その他',  x: 345, y: 430, width: 120, depth: 55,  widthMm: 1500, depthMm: 600,  rotation: 0 },
    { number: 25, name: '㉕ 移動台',                           type: 'その他',  x: 475, y: 430, width: 80,  depth: 55,  widthMm: 900,  depthMm: 600,  rotation: 0 },
    { number: 26, name: '㉖ 移動シェルフ',                     type: 'ラック',  x: 565, y: 430, width: 55,  depth: 75,  widthMm: 600,  depthMm: 800,  rotation: 0 },
  ],
};

export const ALL_PRESETS: KitchenPreset[] = [ASTERA_PRESET];
