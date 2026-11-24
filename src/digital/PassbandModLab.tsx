import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ConstellationPoint,
  PassbandScheme,
  simulatePassband,
} from './digitalMath';
import { PlotCanvas } from './PlotCanvas';

const SCHEMES: PassbandScheme[] = [
  'OOK',
  '4-ASK',
  'BPSK',
  'QPSK',
  '8-PSK',
  '16-QAM',
  'BFSK',
];

const ConstellationCanvas: React.FC<{
  scheme: PassbandScheme;
  points: ConstellationPoint[];
  cloud: { i: number; q: number; correct: boolean }[];
  axis1: string;
  axis2: string;
}> = ({ scheme, points, cloud, axis1, axis2 }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 280;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    const maxCoord = Math.max(...points.map((p) => Math.max(Math.abs(p.i), Math.abs(p.q))), 1) * 1.4;
    const pad = 28;
    const span = size - 2 * pad;
    const mapX = (v: number) => pad + ((v + maxCoord) / (2 * maxCoord)) * span;
    const mapY = (v: number) => pad + span - ((v + maxCoord) / (2 * maxCoord)) * span;

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, mapY(0));
    ctx.lineTo(size - pad, mapY(0));
    ctx.moveTo(mapX(0), pad);
    ctx.lineTo(mapX(0), size - pad);
    ctx.stroke();

    // Decision boundaries
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    if (scheme === 'OOK') {
      ctx.moveTo(mapX(0.5), pad);
      ctx.lineTo(mapX(0.5), size - pad);
    } else if (scheme === '4-ASK') {
      [-2, 0, 2].forEach((thr) => {
        ctx.moveTo(mapX(thr), pad);
        ctx.lineTo(mapX(thr), size - pad);
      });
    } else if (scheme === 'BFSK') {
      ctx.moveTo(mapX(-maxCoord), mapY(-maxCoord));
      ctx.lineTo(mapX(maxCoord), mapY(maxCoord));
    } else if (scheme === '16-QAM') {
      [-2, 0, 2].forEach((thr) => {
        ctx.moveTo(mapX(thr), pad);
        ctx.lineTo(mapX(thr), size - pad);
        ctx.moveTo(pad, mapY(thr));
        ctx.lineTo(size - pad, mapY(thr));
      });
    } else if (scheme === '8-PSK') {
      for (let m = 0; m < 8; m++) {
        const ang = (m * Math.PI) / 4;
        ctx.moveTo(mapX(0), mapY(0));
        ctx.lineTo(mapX(Math.cos(ang) * maxCoord), mapY(Math.sin(ang) * maxCoord));
      }
    }
    ctx.stroke();
    ctx.restore();

    // Received noisy symbol cloud
    for (const pt of cloud) {
      ctx.fillStyle = pt.correct ? 'rgba(56, 189, 248, 0.45)' : 'rgba(244, 63, 94, 0.75)';
      ctx.beginPath();
      ctx.arc(mapX(pt.i), mapY(pt.q), 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ideal signal-space constellation points
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (const p of points) {
      const px = mapX(p.i);
      const py = mapY(p.q);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(p.bits, px, py - 8);
    }

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(axis1, size - 8, mapY(0) - 5);
    if (axis2) {
      ctx.textAlign = 'left';
      ctx.fillText(axis2, mapX(0) + 5, 16);
    }
  }, [scheme, points, cloud, axis1, axis2]);

  return (
    <canvas
      ref={ref}
      style={{ width: 280, height: 280 }}
      className="rounded-lg border border-slate-700/80 mx-auto block"
    />
  );
};

export const PassbandModLab: React.FC = () => {
  const [scheme, setScheme] = useState<PassbandScheme>('QPSK');
  const [bitStr, setBitStr] = useState('1000011110110001');
  const [fc, setFc] = useState(3);
  const [noiseStd, setNoiseStd] = useState(0.22);

  const sim = useMemo(
    () => simulatePassband(scheme, bitStr, fc, noiseStd),
    [scheme, bitStr, fc, noiseStd]
  );

  return (
    <div className="space-y-4">
      {/* Scheme Selector */}
      <div className="flex flex-wrap gap-2">
        {SCHEMES.map((s) => (
          <button
            key={s}
            onClick={() => setScheme(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              scheme === s
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/70 p-4 rounded-lg border border-slate-800 text-xs text-slate-300">
        <label>
          Input Bitstream (padded to {sim.k} bits/sym)
          <input
            type="text"
            value={bitStr}
            onChange={(e) => setBitStr(e.target.value.replace(/[^01]/g, '').slice(0, 32))}
            className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-sky-300"
          />
        </label>
        <label>
          Carrier Cycles / Symbol (f_c · T): <span className="text-sky-400 font-mono">{fc}</span>
          <input
            type="range"
            min={2}
            max={6}
            step={1}
            value={fc}
            onChange={(e) => setFc(Number(e.target.value))}
            className="w-full mt-2"
          />
        </label>
        <label>
          AWGN Noise σ: <span className="text-amber-400 font-mono">{noiseStd.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1.2}
            step={0.04}
            value={noiseStd}
            onChange={(e) => setNoiseStd(Number(e.target.value))}
            className="w-full mt-2"
          />
        </label>
      </div>

      {/* Coherent Correlator Readout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div className="bg-slate-900 p-3 rounded border border-slate-800">
          <div className="text-slate-400">Transmitted Bits</div>
          <div className="text-sky-300 break-all mt-0.5">{sim.paddedBits}</div>
        </div>
        <div className="bg-slate-900 p-3 rounded border border-slate-800">
          <div className="text-slate-400">Correlator Receiver Output</div>
          <div className="text-emerald-300 break-all mt-0.5">{sim.decodedBits}</div>
        </div>
        <div className="bg-slate-900 p-3 rounded border border-slate-800">
          <div className="text-slate-400">Spectral Efficiency / Est. BER</div>
          <div className="text-amber-300 mt-0.5">
            {sim.k} bit/sym · BER ≈ {(sim.ber * 100).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Signal Space + Passband PSD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div className="text-xs font-semibold text-slate-200 mb-2 text-center">
            {scheme} Signal-Space (Constellation) Diagram
          </div>
          <ConstellationCanvas
            scheme={scheme}
            points={sim.points}
            cloud={sim.rxCloud}
            axis1={sim.axisLabel1}
            axis2={sim.axisLabel2}
          />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <PlotCanvas
            title={`${scheme} Passband Modulated Waveform s(t)`}
            xLabel="Symbol Intervals (t / T)"
            yLabel="s(t)"
            series={[
              { x: sim.t, y: sim.noisyWaveform, color: 'rgba(244, 63, 94, 0.35)', label: 'Rx + Noise' },
              { x: sim.t, y: sim.waveform, color: '#38bdf8', label: 'Tx s(t)' },
            ]}
            yRange={[-1.4, 1.4]}
            height={175}
          />
          <PlotCanvas
            title={`${scheme} Passband Power Spectral Density (BW Scales as 1 / log₂M)`}
            xLabel="Normalized Frequency (f / Rb)"
            yLabel="PSD"
            series={[{ x: sim.fPsd, y: sim.psdVal, color: '#a855f7', label: 'Passband PSD' }]}
            height={175}
          />
        </div>
      </div>
    </div>
  );
};