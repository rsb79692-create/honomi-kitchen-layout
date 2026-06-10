'use client';
import dynamic from 'next/dynamic';

const KitchenLayout = dynamic(() => import('@/components/KitchenLayout'), { ssr: false });

export default function Page() {
  return <KitchenLayout />;
}
