import type { CatalogItem } from '@/types/catalog';

const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳','㉑','㉒','㉓','㉔','㉕','㉖'];

export const circledNumber = (n: number): string => CIRCLED[n - 1] ?? String(n);
export const catalogDisplayName = (item: CatalogItem): string =>
  `${circledNumber(item.no)} ${item.name}`;

export const ASTERA_CATALOG_DEFAULT: CatalogItem[] = [
  { no: 1,  name: '手洗いシンク',                        widthMm: 450,  depthMm: 450 },
  { no: 2,  name: '冷凍冷蔵庫',                           widthMm: 1200, depthMm: 600 },
  { no: 3,  name: '戸棚',                                widthMm: 1200, depthMm: 600 },
  { no: 4,  name: '検食用冷凍ストッカー',                  widthMm: 1200, depthMm: 600 },
  { no: 5,  name: '炊飯台',                               widthMm: 750,  depthMm: 700 },
  { no: 6,  name: 'IHジャー炊飯器',                      widthMm: 750,  depthMm: 700 },
  { no: 7,  name: 'IHジャー炊飯器',                      widthMm: 900,  depthMm: 750 },
  { no: 8,  name: '二槽シンク',                           widthMm: 600,  depthMm: 450 },
  { no: 9,  name: '台下戸棚',                             widthMm: 1200, depthMm: 600 },
  { no: 10, name: 'テーブル形冷凍庫',                     widthMm: 700,  depthMm: 590 },
  { no: 11, name: 'ブリクサー',                           widthMm: 850,  depthMm: 800 },
  { no: 12, name: '膳台',                                widthMm: 450,  depthMm: 600 },
  { no: 13, name: 'ガステーブル',                         widthMm: 1500, depthMm: 600 },
  { no: 14, name: '作業台',                               widthMm: 750,  depthMm: 700 },
  { no: 15, name: 'ガススチームコンベクションオーブン',    widthMm: 600,  depthMm: 450 },
  { no: 16, name: '電子レンジ',                           widthMm: 450,  depthMm: 450 },
  { no: 17, name: 'テーブル形冷蔵庫',                     widthMm: 1800, depthMm: 800 },
  { no: 18, name: '電子ジャー',                           widthMm: 1800, depthMm: 800 },
  { no: 19, name: 'マイコンスープジャー',                 widthMm: 1200, depthMm: 600 },
  { no: 20, name: 'ジャー置台',                           widthMm: 600,  depthMm: 450 },
  { no: 21, name: '二槽シンク',                           widthMm: 600,  depthMm: 650 },
  { no: 22, name: '食器洗浄機',                           widthMm: 1500, depthMm: 600 },
  { no: 23, name: 'パイプ棚',                             widthMm: 1500, depthMm: 600 },
  { no: 24, name: '包丁まな板消毒保管機',                 widthMm: 1500, depthMm: 600 },
  { no: 25, name: '移動台',                               widthMm: 900,  depthMm: 600 },
  { no: 26, name: '移動シェルフ',                         widthMm: 600,  depthMm: 800 },
];
