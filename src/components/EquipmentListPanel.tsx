'use client';
import { useEffect, useRef, useState } from 'react';
import type { CropRegion } from '@/types/project';

const RENDER_SCALE = 2.0;

interface Props {
  pdfData: ArrayBuffer | null;
  pageNumber: number;
  cropRegion?: CropRegion;
  onSetCrop: () => void;
}

export default function EquipmentListPanel({ pdfData, pageNumber, cropRegion, onSetCrop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1.0);

  const cropKey = JSON.stringify(cropRegion ?? null);

  useEffect(() => {
    if (!pdfData || !cropRegion || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const pdf = await pdfjs.getDocument({ data: pdfData.slice(0) }).promise;
        const page = await pdf.getPage(Math.max(1, Math.min(pageNumber, pdf.numPages)));
        const vp = page.getViewport({ scale: RENDER_SCALE });

        const offscreen = document.createElement('canvas');
        offscreen.width = vp.width;
        offscreen.height = vp.height;
        await page.render({ canvas: offscreen, viewport: vp }).promise;

        if (cancelled || !canvasRef.current) return;
        const cx = Math.round(cropRegion.x * vp.width);
        const cy = Math.round(cropRegion.y * vp.height);
        const cw = Math.round(cropRegion.w * vp.width);
        const ch = Math.round(cropRegion.h * vp.height);

        const canvas = canvasRef.current;
        canvas.width = cw;
        canvas.height = ch;
        canvas.getContext('2d')!.drawImage(offscreen, cx, cy, cw, ch, 0, 0, cw, ch);
      } catch (e) {
        console.error('[EquipmentListPanel]', e);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfData, pageNumber, cropKey]);

  return (
    <div style={{
      width: 260, background: '#f8f8f8', borderLeft: '1px solid #ccc',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{
        padding: '6px 10px', borderBottom: '1px solid #ddd',
        display: 'flex', alignItems: 'center', gap: 6,
        background: '#efefef', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>機器リスト</span>
        <button
          onClick={onSetCrop}
          style={{ fontSize: 11, padding: '2px 7px', cursor: 'pointer', border: '1px solid #bbb', borderRadius: 3, background: '#fff' }}
        >
          範囲設定
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
          style={{ width: 22, height: 22, cursor: 'pointer', border: '1px solid #bbb', borderRadius: 3, background: '#fff', fontSize: 14, lineHeight: 1, padding: 0 }}
          title="拡大"
        >+</button>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
          style={{ width: 22, height: 22, cursor: 'pointer', border: '1px solid #bbb', borderRadius: 3, background: '#fff', fontSize: 14, lineHeight: 1, padding: 0 }}
          title="縮小"
        >−</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 4 }}>
        {!pdfData && (
          <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 20 }}>
            PDFをアップロードしてください
          </p>
        )}
        {pdfData && !cropRegion && (
          <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
            「範囲設定」で<br />機器リストエリアを<br />指定してください
          </p>
        )}
        {pdfData && cropRegion && (
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'inline-block' }}>
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: 'none' }} />
          </div>
        )}
      </div>
    </div>
  );
}
