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
  width: number;
  depth: number;
  rotation: 0 | 90;
  memo: string;
}
