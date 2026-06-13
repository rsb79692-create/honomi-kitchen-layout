export interface KitchenPolyline {
  id: string;
  points: { x: number; y: number }[];
  strokeWidth: number;
  color: string;
  closed?: boolean; // reserved: future polygon closure / fill / in-out detection
}
