// Hand-traced kitchen outline.
// Edit coordinates here to match your actual floor plan.
// Canvas default: 900 × 700 px  (1 px ≈ 1 cm at SCALE_CM_PER_PX = 1)

export type SegmentType = 'wall' | 'door';

export interface OutlineSegment {
  type: SegmentType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const KITCHEN_OUTLINE: OutlineSegment[] = [
  // ---- 外周壁（時計回り） ----
  { type: 'wall', x1:  60, y1:  60, x2: 840, y2:  60 }, // 上壁
  { type: 'wall', x1: 840, y1:  60, x2: 840, y2: 640 }, // 右壁
  { type: 'wall', x1: 840, y1: 640, x2: 510, y2: 640 }, // 下壁（右）
  { type: 'door', x1: 510, y1: 640, x2: 390, y2: 640 }, // 出入口（幅 120cm 相当）
  { type: 'wall', x1: 390, y1: 640, x2:  60, y2: 640 }, // 下壁（左）
  { type: 'wall', x1:  60, y1: 640, x2:  60, y2:  60 }, // 左壁
];
