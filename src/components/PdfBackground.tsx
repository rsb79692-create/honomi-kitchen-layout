'use client';
import { useEffect, useRef, useState } from 'react';
import type { CropRegion } from '@/types/project';

const RENDER_SCALE = 1.5;

interface Props {
  pdfData: ArrayBuffer | null;
  pageNumber: number;
  cropRegion?: CropRegion;
  visible: boolean;
  onSizeReady: (width: number, height: number) => void;
  onTotalPagesReady?: (total: number) => void;
}

export default function PdfBackground({ pdfData, pageNumber, cropRegion, visible, onSizeReady, onTotalPagesReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const cropKey = JSON.stringify(cropRegion ?? null);

  useEffect(() => {
    setError(null);

    if (!pdfData) {
      onSizeReady(900, 700);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const pdf = await pdfjs.getDocument({ data: pdfData.slice(0) }).promise;
        if (cancelled) return;

        if (onTotalPagesReady) onTotalPagesReady(pdf.numPages);

        const page = await pdf.getPage(Math.max(1, Math.min(pageNumber, pdf.numPages)));
        const vp = page.getViewport({ scale: RENDER_SCALE });

        const offscreen = document.createElement('canvas');
        offscreen.width = vp.width;
        offscreen.height = vp.height;
        await page.render({ canvas: offscreen, viewport: vp }).promise;
        if (cancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;

        if (cropRegion) {
          const cx = Math.round(cropRegion.x * vp.width);
          const cy = Math.round(cropRegion.y * vp.height);
          const cw = Math.round(cropRegion.w * vp.width);
          const ch = Math.round(cropRegion.h * vp.height);
          canvas.width = cw;
          canvas.height = ch;
          ctx.drawImage(offscreen, cx, cy, cw, ch, 0, 0, cw, ch);
          onSizeReady(cw, ch);
        } else {
          canvas.width = vp.width;
          canvas.height = vp.height;
          ctx.drawImage(offscreen, 0, 0);
          onSizeReady(vp.width, vp.height);
        }
      } catch (err) {
        if (!cancelled) {
          setError('PDF読み込みエラー: ' + String(err));
          onSizeReady(900, 700);
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfData, pageNumber, cropKey]);

  if (error) return <div style={{ color: 'red', padding: 8, position: 'absolute', top: 0, left: 0, fontSize: 12 }}>{error}</div>;

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        visibility: visible ? 'visible' : 'hidden',
      }}
    />
  );
}
