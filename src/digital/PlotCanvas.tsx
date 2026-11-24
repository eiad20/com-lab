import React, { useEffect, useRef } from 'react';

export interface Series {
  x: number[];
  y: number[];
  color: string;
  label?: string;
  lineWidth?: number;
  dashed?: boolean;
  step?: boolean;
}

interface PlotCanvasProps {
  title: string;
  xLabel?: string;
  yLabel?: string;
  series: Series[];
  yRange?: [number, number];
  height?: number;
  zeroLine?: boolean;
  impulses?: { x: number; y: number; color: string }[];
}

export const PlotCanvas: React.FC<PlotCanvasProps> = ({
  title,
  xLabel = '',
  yLabel = '',
  series,
  yRange,
  height = 220,
  zeroLine = true,
  impulses = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const pad = { top: 26, right: 16, bottom: 28, left: 46 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = yRange ? yRange[0] : Infinity;
    let yMax = yRange ? yRange[1] : -Infinity;

    for (const s of series) {
      for (let i = 0; i < s.x.length; i++) {
        if (s.x[i] < xMin) xMin = s.x[i];
        if (s.x[i] > xMax) xMax = s.x[i];
        if (!yRange) {
          if (s.y[i] < yMin) yMin = s.y[i];
          if (s.y[i] > yMax) yMax = s.y[i];
        }
      }
    }
    if (!isFinite(xMin) || xMin === xMax) {
      xMin = 0;
      xMax = 1;
    }
    if (!isFinite(yMin) || yMin === yMax) {
      yMin = -1;
      yMax = 1;
    } else if (!yRange) {
      const m = (yMax - yMin) * 0.1;
      yMin -= m;
      yMax += m;
    }

    const mapX = (v: number) => pad.left + ((v - xMin) / (xMax - xMin)) * plotW;
    const mapY = (v: number) => pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    // Gridlines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = pad.top + (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(pad.left + plotW, gy);
      ctx.stroke();

      const yVal = yMax - ((yMax - yMin) * i) / 4;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(yVal.toFixed(1), pad.left - 6, gy + 3);
    }

    for (let i = 0; i <= 5; i++) {
      const gx = pad.left + (plotW * i) / 5;
      ctx.beginPath();
      ctx.moveTo(gx, pad.top);
      ctx.lineTo(gx, pad.top + plotH);
      ctx.stroke();

      const xVal = xMin + ((xMax - xMin) * i) / 5;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(xVal.toFixed(1), gx, height - 10);
    }

    // Zero line
    if (zeroLine && yMin < 0 && yMax > 0) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, mapY(0));
      ctx.lineTo(pad.left + plotW, mapY(0));
      ctx.stroke();
    }

    // Series
    for (const s of series) {
      if (s.x.length === 0) continue;
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth ?? 1.8;
      if (s.dashed) ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(mapX(s.x[0]), mapY(s.y[0]));
      for (let i = 1; i < s.x.length; i++) {
        if (s.step) {
          ctx.lineTo(mapX(s.x[i]), mapY(s.y[i - 1]));
        }
        ctx.lineTo(mapX(s.x[i]), mapY(s.y[i]));
      }
      ctx.stroke();
      ctx.restore();
    }

    // Dirac impulses (e.g., DC delta in Unipolar PSD)
    for (const imp of impulses) {
      const px = mapX(imp.x);
      const py0 = mapY(0);
      const py1 = mapY(imp.y);
      ctx.strokeStyle = imp.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, py0);
      ctx.lineTo(px, py1);
      ctx.stroke();
      ctx.fillStyle = imp.color;
      ctx.beginPath();
      ctx.moveTo(px, py1 - 4);
      ctx.lineTo(px - 4, py1 + 4);
      ctx.lineTo(px + 4, py1 + 4);
      ctx.closePath();
      ctx.fill();
    }

    // Title & Labels
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, pad.left, 16);

    if (xLabel) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(xLabel, pad.left + plotW, height - 2);
    }
    if (yLabel) {
      ctx.save();
      ctx.translate(11, pad.top + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }

    // Legend
    let lx = pad.left + plotW;
    ctx.font = '11px sans-serif';
    for (let i = series.length - 1; i >= 0; i--) {
      const label = series[i].label;
      if (!label) continue;
      const tw = ctx.measureText(label).width;
      lx -= tw + 18;
      ctx.fillStyle = series[i].color;
      ctx.fillRect(lx, 8, 10, 8);
      ctx.fillStyle = '#cbd5e1';
      ctx.textAlign = 'left';
      ctx.fillText(label, lx + 13, 16);
    }
  }, [title, xLabel, yLabel, series, yRange, height, zeroLine, impulses]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height }}
      className="rounded-lg border border-slate-700/80 block"
    />
  );
};