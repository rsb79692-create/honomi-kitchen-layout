'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  onSizeReady: (width: number, height: number) => void;
  visible: boolean;
}

export default function PdfBackground({ onSizeReady, visible }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        const pdf = await pdfjs.getDocument({ url: '/floor-plan.pdf' }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        if (!cancelled && canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport }).promise;
          onSizeReady(viewport.width, viewport.height);
        }
      } catch (err) {
        console.error('[PdfBackground] error:', err);
        if (!cancelled) setError('PDF読み込みエラー: ' + String(err));
      }
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div style={{ color: 'red', padding: 8 }}>{error}</div>;

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', visibility: visible ? 'visible' : 'hidden' }}
    />
  );
}
