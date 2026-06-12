import type { Equipment } from './equipment';
import type { KitchenLine } from './kitchenLine';
import type { CatalogItem } from './catalog';

export interface CropRegion {
  x: number; // 0-1 fraction of PDF page width
  y: number; // 0-1 fraction of PDF page height
  w: number;
  h: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  pdfFileName?: string;
  pdfPageNumber: number;
  pdfTotalPages: number;
  kitchenCrop?: CropRegion;
  equipmentListCrop?: CropRegion;
  equipments: Equipment[];
  kitchenLines: KitchenLine[];
  showPdf: boolean;
  showEquipmentList: boolean;
  canvasZoom: number; // 0.5 – 2.0、10% 刻み
  scalePxPerMm?: number; // 縮尺: 1mm あたりの canvas px
  mappingNames?: Record<number, string>; // 案件ごとの機器名上書き: プリセット番号 → 表示名
  equipmentCatalog?: CatalogItem[]; // 案件ごとの機器一覧データ
  overlapAllowed?: boolean; // 機器の重なりを許可するか (デフォルト: false = 重なり禁止)
}

export function defaultProject(): Project {
  return {
    id: String(Date.now()) + Math.random().toString(36).slice(2, 7),
    name: '新規案件',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pdfPageNumber: 1,
    pdfTotalPages: 1,
    equipments: [],
    kitchenLines: [],
    showPdf: true,
    showEquipmentList: false,
    canvasZoom: 1.0,
  };
}
