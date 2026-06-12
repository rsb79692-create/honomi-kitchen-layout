import type { EquipmentType } from '@/types/equipment';

export interface PresetItem {
  number: number;
  name: string;
  type: EquipmentType;
  x: number;        // initial canvas x (approximate)
  y: number;        // initial canvas y (approximate)
  width: number;    // initial display px (approximate)
  depth: number;    // initial display px (approximate)
  widthMm: number;  // actual physical width in mm
  depthMm: number;  // actual physical depth in mm
  rotation: 0 | 90;
  memo?: string;
}

export interface KitchenPreset {
  id: string;
  label: string;
  items: PresetItem[];
}

// アステラ新築厨房 — 機器番号①〜㉖
// x/y/width/depth は概算配置。widthMm/depthMm が実際の外形寸法。
// 縮尺設定後に「実寸を図形に反映」を実行すると正確なサイズになります。
export const ASTERA_PRESET: KitchenPreset = {
  id: 'astera-2024',
  label: 'アステラ新築厨房（①〜㉖）',
  items: [
    // ── 上段（y: 20）— 下処理・冷蔵ゾーン ──────────────────────────────
    { number: 1,  name: '① 手洗いシンク',       type: 'シンク',   x: 20,  y: 20,  width: 45,  depth: 45,  widthMm: 450,  depthMm: 450,  rotation: 0 },
    { number: 2,  name: '② 作業台（下処理）',   type: '作業台',  x: 90,  y: 20,  width: 120, depth: 60,  widthMm: 1200, depthMm: 600,  rotation: 0 },
    { number: 3,  name: '③ シンク（2槽）',       type: 'シンク',   x: 240, y: 20,  width: 120, depth: 60,  widthMm: 1200, depthMm: 600,  rotation: 0 },
    { number: 4,  name: '④ 作業台',             type: '作業台',  x: 400, y: 20,  width: 120, depth: 60,  widthMm: 1200, depthMm: 600,  rotation: 0 },
    { number: 5,  name: '⑤ 冷蔵庫（立型）',     type: '冷蔵庫',  x: 560, y: 20,  width: 75,  depth: 70,  widthMm: 750,  depthMm: 700,  rotation: 0 },
    { number: 6,  name: '⑥ 冷凍庫（立型）',     type: '冷凍庫',  x: 670, y: 20,  width: 75,  depth: 70,  widthMm: 750,  depthMm: 700,  rotation: 0 },
    { number: 7,  name: '⑦ 業務用冷蔵庫',       type: '冷蔵庫',  x: 790, y: 20,  width: 90,  depth: 75,  widthMm: 900,  depthMm: 750,  rotation: 0 },
    { number: 8,  name: '⑧ ラック',             type: 'ラック',  x: 920, y: 20,  width: 60,  depth: 45,  widthMm: 600,  depthMm: 450,  rotation: 0 },

    // ── 2段目（y: 160）— 加熱調理ゾーン ────────────────────────────────
    { number: 9,  name: '⑨ ガスレンジ',         type: 'コンロ',  x: 20,  y: 160, width: 120, depth: 60,  widthMm: 1200, depthMm: 600,  rotation: 0 },
    { number: 10, name: '⑩ スチコン',           type: 'スチコン', x: 180, y: 150, width: 85,  depth: 90,  widthMm: 700,  depthMm: 590,  rotation: 0 },
    { number: 11, name: '⑪ ガス回転釜',         type: 'コンロ',  x: 310, y: 155, width: 85,  depth: 80,  widthMm: 850,  depthMm: 800,  rotation: 0 },
    { number: 12, name: '⑫ フライヤー',         type: 'コンロ',  x: 440, y: 160, width: 45,  depth: 60,  widthMm: 450,  depthMm: 600,  rotation: 0 },
    { number: 13, name: '⑬ 作業台（調理）',     type: '作業台',  x: 530, y: 160, width: 150, depth: 60,  widthMm: 1500, depthMm: 600,  rotation: 0 },
    { number: 14, name: '⑭ 冷凍庫',            type: '冷凍庫',  x: 730, y: 160, width: 75,  depth: 70,  widthMm: 750,  depthMm: 700,  rotation: 0 },
    { number: 15, name: '⑮ ラック',            type: 'ラック',  x: 860, y: 160, width: 60,  depth: 45,  widthMm: 600,  depthMm: 450,  rotation: 0 },

    // ── 中段（y: 340）— 作業テーブル・中央島 ───────────────────────────
    { number: 16, name: '⑯ 手洗いシンク',       type: 'シンク',   x: 20,  y: 360, width: 45,  depth: 45,  widthMm: 450,  depthMm: 450,  rotation: 0 },
    { number: 17, name: '⑰ 作業台（中央）',     type: '作業台',  x: 110, y: 340, width: 180, depth: 80,  widthMm: 1800, depthMm: 800,  rotation: 0 },
    { number: 18, name: '⑱ 作業台（中央）',     type: '作業台',  x: 340, y: 340, width: 180, depth: 80,  widthMm: 1800, depthMm: 800,  rotation: 0 },
    { number: 19, name: '⑲ 作業台',             type: '作業台',  x: 570, y: 340, width: 120, depth: 60,  widthMm: 1200, depthMm: 600,  rotation: 0 },
    { number: 20, name: '⑳ ラック',             type: 'ラック',  x: 740, y: 345, width: 60,  depth: 45,  widthMm: 600,  depthMm: 450,  rotation: 0 },

    // ── 下段（y: 500）— 配膳・食器洗浄ゾーン ──────────────────────────
    { number: 21, name: '㉑ 食器洗浄機',         type: 'その他',  x: 20,  y: 500, width: 60,  depth: 65,  widthMm: 600,  depthMm: 650,  rotation: 0 },
    { number: 22, name: '㉒ 配膳台',             type: '配膳台',  x: 120, y: 500, width: 150, depth: 60,  widthMm: 1500, depthMm: 600,  rotation: 0 },
    { number: 23, name: '㉓ 配膳台',             type: '配膳台',  x: 320, y: 500, width: 150, depth: 60,  widthMm: 1500, depthMm: 600,  rotation: 0 },
    { number: 24, name: '㉔ 配膳台',             type: '配膳台',  x: 520, y: 500, width: 150, depth: 60,  widthMm: 1500, depthMm: 600,  rotation: 0 },
    { number: 25, name: '㉕ ランチジャー',       type: '配膳台',  x: 720, y: 500, width: 90,  depth: 60,  widthMm: 900,  depthMm: 600,  rotation: 0 },
    { number: 26, name: '㉖ 保温食缶車',         type: 'その他',  x: 860, y: 500, width: 60,  depth: 80,  widthMm: 600,  depthMm: 800,  rotation: 0 },
  ],
};

export const ALL_PRESETS: KitchenPreset[] = [ASTERA_PRESET];
