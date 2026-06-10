'use client';
import { KITCHEN_OUTLINE } from '@/data/kitchenOutlineData';

interface Props {
  width: number;
  height: number;
}

export default function KitchenOutline({ width, height }: Props) {
  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {KITCHEN_OUTLINE.map((seg, i) => {
        const isWall = seg.type === 'wall';
        return (
          <line
            key={i}
            x1={seg.x1}
            y1={seg.y1}
            x2={seg.x2}
            y2={seg.y2}
            stroke={isWall ? '#1a1a1a' : '#777'}
            strokeWidth={isWall ? 3 : 1.5}
            strokeDasharray={isWall ? undefined : '8 5'}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
