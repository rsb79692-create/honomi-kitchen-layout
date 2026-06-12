'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { CropRegion } from '@/types/project';

interface Selection {
  x: number; y: number; w: number; h: number;
}

interface Props {
  pdfData: ArrayBuffer;
  pageNumber: number;
  mode: 'kitchen' | 'equipment-list';
  currentCrop?: CropRegion;
  onConfirm: (crop: CropRegion) => void;
  onClear?: () => void;
  onClose: () => void;
}

export default function PdfCropModal({ pdfData, pageNumber, mode, currentCrop, onConfirm, onClear, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number } | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const pdf = await pdfjs.getDocument({ data: pdfData.slice(0) }).promise;
        const page = await pdf.getPage(Math.max(1, Math.min(pageNumber, pdf.numPages)));

        const maxW = typeof window !== 'undefined' ? window.innerWidth * 0.82 : 1100;
        const maxH = typeof window !== 'undefined' ? window.innerHeight * 0.72 : 800;
        const base = page.getViewport({ scale: 1.0 });
        const scale = Math.min(maxW / base.width, maxH / base.height, 1.8);
        const vp = page.getViewport({ scale });

        if (cancelled || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvas, viewport: vp }).promise;

        if (!cancelled) {
          setCanvasSize({ w: vp.width, h: vp.height });
          if (currentCrop) {
            setSel({
              x: currentCrop.x * vp.width,
              y: currentCrop.y * vp.height,
              w: currentCrop.w * vp.width,
              h: currentCrop.h * vp.height,
            });
          }
        }
      } catch (e) {
        console.error('[PdfCropModal]', e);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfData, pageNumber]);

  const getPos = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !canvasSize) return { x: 0, y: 0 };
    const scaleX = canvasSize.w / rect.width;
    const scaleY = canvasSize.h / rect.height;
    return {
      x: Math.max(0, Math.min((clientX - rect.left) * scaleX, canvasSize.w)),
      y: Math.max(0, Math.min((clientY - rect.top) * scaleY, canvasSize.h)),
    };
  }, [canvasSize]);

  // Convert canvas coords → CSS display coords for overlay positioning
  const toCss = useCallback((v: number, axis: 'x' | 'w') => {
    if (!canvasSize || !canvasRef.current) return v;
    const rect = canvasRef.current.getBoundingClientRect();
    const scale = axis === 'x' || axis === 'w'
      ? rect.width / canvasSize.w
      : rect.height / canvasSize.h;
    return v * scale;
  }, [canvasSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getPos(e.clientX, e.clientY);
    dragStart.current = pos;
    isDragging.current = true;
    setSel({ x: pos.x, y: pos.y, w: 0, h: 0 });
  }, [getPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !dragStart.current) return;
    const pos = getPos(e.clientX, e.clientY);
    const s = dragStart.current;
    setSel({
      x: Math.min(s.x, pos.x),
      y: Math.min(s.y, pos.y),
      w: Math.abs(pos.x - s.x),
      h: Math.abs(pos.y - s.y),
    });
  }, [getPos]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleConfirm = useCallback(() => {
    if (!sel || !canvasSize || sel.w < 5 || sel.h < 5) return;
    onConfirm({
      x: sel.x / canvasSize.w,
      y: sel.y / canvasSize.h,
      w: sel.w / canvasSize.w,
      h: sel.h / canvasSize.h,
    });
  }, [sel, canvasSize, onConfirm]);

  const modeLabel = mode === 'kitchen' ? '厨房図面エリア' : '機器リストエリア';
  const color = mode === 'kitchen' ? '#3b82f6' : '#10b981';
  const bgAlpha = mode === 'kitchen' ? 'rgba(59,130,246,0.18)' : 'rgba(16,185,129,0.18)';
  const hasValidSel = sel && sel.w >= 5 && sel.h >= 5;

  // CSS display rect (scale from canvas to CSS pixels)
  const cssRect = sel && canvasRef.current && canvasSize ? (() => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = rect.width / canvasSize.w;
    const sy = rect.height / canvasSize.h;
    return { left: sel.x * sx, top: sel.y * sy, width: sel.w * sx, height: sel.h * sy };
  })() : null;
  void toCss; // suppress unused warning

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: 16,
        maxWidth: '92vw', maxHeight: '96vh',
        display: 'flex', flexDirection: 'column', gap: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{modeLabel}を範囲指定</span>
          <span style={{ fontSize: 12, color: '#666' }}>ドラッグで選択 → ボタンで確定</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ padding: '4px 12px', cursor: 'pointer', fontSize: 13 }}>閉じる</button>
        </div>

        <div
          ref={wrapRef}
          style={{ overflow: 'auto', maxHeight: 'calc(96vh - 110px)', position: 'relative',
            cursor: 'crosshair', userSelect: 'none', lineHeight: 0 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
            {cssRect && cssRect.width > 0 && cssRect.height > 0 && (
              <div style={{
                position: 'absolute',
                left: cssRect.left, top: cssRect.top,
                width: cssRect.width, height: cssRect.height,
                border: `2px solid ${color}`,
                background: bgAlpha,
                pointerEvents: 'none',
                boxSizing: 'border-box',
              }} />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {hasValidSel && canvasSize && (
            <span style={{ fontSize: 12, color: '#555' }}>
              {Math.round(sel!.w)} × {Math.round(sel!.h)} px 選択中
            </span>
          )}
          {onClear && currentCrop && (
            <button
              onClick={() => { setSel(null); onClear(); }}
              style={{ padding: '6px 14px', background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
            >
              範囲をクリア
            </button>
          )}
          <button
            onClick={handleConfirm}
            disabled={!hasValidSel}
            style={{
              padding: '6px 18px', background: hasValidSel ? color : '#ccc',
              color: '#fff', border: 'none', borderRadius: 4,
              cursor: hasValidSel ? 'pointer' : 'not-allowed', fontSize: 14,
            }}
          >
            この範囲を{modeLabel}として使用
          </button>
        </div>
      </div>
    </div>
  );
}
