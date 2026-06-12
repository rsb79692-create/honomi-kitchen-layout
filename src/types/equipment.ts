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
  width: number;    // canvas display pixels
  depth: number;    // canvas display pixels
  widthMm?: number; // actual physical width in mm
  depthMm?: number; // actual physical depth in mm
  rotation: 0 | 90 | 180 | 270;
  memo: string;
  groupId?: string;
}
