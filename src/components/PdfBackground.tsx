'use client';
import { useEffect, useRef, useState } from 'react';

interface Props {
  onSizeReady: (width: number, height: number) => void;
}

export default function PdfBackground({ onSizeReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

        const pdf = await pdfjs.getDocument({ url: '/floor-plan.pdf' }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        if (!cancelled && canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise;
          onSizeReady(viewport.width, viewport.height);
        }
      } catch {
        if (!cancelled) setError('PDF読み込みエラー');
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
      style={{ display: 'block', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    />
  );
}
