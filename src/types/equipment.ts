export type EquipmentType =
  | '冷蔵庫'
  | '冷凍庫'
  | 'シンク'
  | '作業台'
  | 'コンロ'
  | 'スチコン'
  | '配膳台'
  | 'ラック'
  | 'その他';

export interface Equipment {
  id: string;
  type: EquipmentType;
  name: string;
  x: number;
  y: number;
  width: number;         // LEGACY: kept for backwards compat (old display pixels)
  depth: number;         // LEGACY: kept for backwards compat (old display pixels)
  displayWidth?: number;  // canvas display pixels (primary — set by drag/resize)
  displayHeight?: number; // canvas display pixels (primary — set by drag/resize)
  widthCm?: number;  // actual physical width in cm (memo/attribute only, never affects display)
  depthCm?: number;  // actual physical depth in cm (memo/attribute only, never affects display)
  widthMm?: number;  // actual physical width in mm (for scale application)
  depthMm?: number;  // actual physical depth in mm (for scale application)
  rotation: 0 | 90 | 180 | 270;
  memo: string;
  groupId?: string;
}
