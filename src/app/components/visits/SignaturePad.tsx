import React, { useRef, useState, useEffect } from 'react';
import { P } from '../../utils/palette';
import { X, Check } from 'lucide-react';
import { useAuthStore } from '../../../store/auth.store';

interface SignaturePadProps {
  onConfirm: (dataUrl: string) => void;
  defaultUrl?: string | null;
}

export function SignaturePad({ onConfirm, defaultUrl }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = P.textPrimary;
      }
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setIsEmpty(false);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsEmpty(true);
    }
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (canvas && !isEmpty) {
      onConfirm(canvas.toDataURL('image/png'));
    }
  };

  const useSavedSignature = () => {
    if (user?.signatureUrl) {
      onConfirm(user.signatureUrl);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {defaultUrl ? (
        <div style={{ 
          width: '100%', 
          height: 100, 
          borderRadius: 8, 
          border: `1.5px solid ${P.border}`, 
          background: P.bgSunken,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <img src={defaultUrl} alt="Signature" style={{ maxHeight: '100%', maxWidth: '100%' }} />
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={400}
            height={100}
            style={{
              width: '100%',
              height: 100,
              borderRadius: 8,
              border: `1.5px dashed ${isEmpty ? P.borderStrong : P.violet}`,
              background: P.bgSunken,
              cursor: 'crosshair',
              touchAction: 'none'
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={useSavedSignature}
              disabled={!user?.signatureUrl}
              style={{
                background: 'none',
                border: 'none',
                color: user?.signatureUrl ? P.violet : P.textMuted,
                fontSize: 12,
                cursor: user?.signatureUrl ? 'pointer' : 'not-allowed',
                padding: 0
              }}
            >
              Use saved signature
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={clearCanvas}
                disabled={isEmpty}
                style={{
                  background: 'transparent',
                  border: `1px solid ${P.border}`,
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: isEmpty ? 'not-allowed' : 'pointer',
                  color: P.textSecondary,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <X size={12} /> Clear
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isEmpty}
                style={{
                  background: isEmpty ? P.borderStrong : P.violet,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: isEmpty ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Check size={12} /> Confirm
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
