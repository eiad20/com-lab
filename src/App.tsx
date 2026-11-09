// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  Radio,
  Cpu,
  Sliders,
  Compass,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Info,
  Waves,
  ShieldCheck,
  Volume2,
  Radar,
  Layers,
  ArrowRight,
  RefreshCw,
  Code2,
  Filter,
  GitBranch,
  Gauge,
  BookOpen
} from 'lucide-react';

// ============================================================================
// HELPER: High-DPI Responsive Canvas Hook
// ============================================================================
type CanvasDraw = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

function useCanvas(draw: CanvasDraw, deps: React.DependencyList = []) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
      const height = canvas.clientHeight || 220;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      draw(ctx, width, height);
      ctx.restore();
    };

    render();
    window.addEventListener('resize', render);
    return () => {
      window.removeEventListener('resize', render);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, deps);

  return canvasRef;
}

// ============================================================================
// MATHEMATICAL HELPERS: Sinc & Bessel Function J_n(beta) via Integral
// ============================================================================
function sinc(x: number): number {
  if (Math.abs(x) < 1e-6) return 1.0;
  return Math.sin(Math.PI * x) / (Math.PI * x);
}

// Numerical computation of nth-order Bessel function of first kind J_n(beta)
function besselJ(n: number, beta: number): number {
  const steps = 120;
  const dTheta = Math.PI / steps;
  let sum = 0;
  const absN = Math.abs(n);
  for (let i = 0; i <= steps; i++) {
    const theta = i * dTheta;
    const weight = i === 0 || i === steps ? 0.5 : 1.0;
    sum += weight * Math.cos(absN * theta - beta * Math.sin(theta));
  }
  const val = sum / steps;
  if (n < 0 && absN % 2 === 1) return -val;
  return val;
}

// ============================================================================
// LECTURE 1 MODULE: SIGNALS, FOURIER TRANSFORM, LTI & OCTAVE FFT
// ============================================================================
function Lecture1Lab() {
  const [subTab, setSubTab] = useState('scaling'); // 'scaling' | 'lti' | 'octave'

  // --- Sub-tab 1A State: Time-Bandwidth Product & Scaling ---
  const [pulseShape, setPulseShape] = useState('rect'); // 'rect' | 'tri'
  const [scaleA, setScaleA] = useState(1.0); // Time scaling factor a
  const [ampA, setAmpA] = useState(1.0); // Pulse amplitude A
  const tau = 1.0; // Base pulse half-width parameter

  // Effective duration & bandwidth
  const effTau = tau * scaleA;
  const firstNullBw = pulseShape === 'rect' ? 1 / (2 * effTau) : 1 / effTau;
  const tbProduct = (2 * effTau) * firstNullBw;
  const energyParseval =
    pulseShape === 'rect'
      ? ampA * ampA * (2 * effTau)
      : (2 / 3) * ampA * ampA * effTau;

  // --- Sub-tab 1B State: LTI System & Frequency Response ---
  const [ltiInputType, setLtiInputType] = useState('multitone'); // 'multitone' | 'square'
  const [filterType, setFilterType] = useState('LPF'); // 'LPF' | 'BPF'
  const [cutoffFreq, setCutoffFreq] = useState(2.5); // Hz (harmonics at 1, 3, 5 Hz)

  // --- Sub-tab 1C State: Octave FFT & fftshift ---
  const [NCount, setNCount] = useState(64); // 64 (even) or 63 (odd)
  const [sigFreq, setSigFreq] = useState(8); // Signal frequency Hz
  const ts = 0.01; // Sampling step 0.01s -> fs = 100 Hz
  const fs = 1 / ts;
  const totalT = NCount * ts;
  const df = 1 / totalT;

  // Canvas 1A-1: Time Domain Pulse g(t/a)
  const l1TimeCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const midX = width / 2;
      const baseLine = height - 32;
      const maxT = 4.0;
      const tToX = (t) => midX + (t / maxT) * (width * 0.44);
      const valToY = (v) => baseLine - (v / 1.6) * (height - 58);

      // Axes
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, baseLine);
      ctx.lineTo(width - 20, baseLine);
      ctx.moveTo(midX, 15);
      ctx.lineTo(midX, baseLine + 6);
      ctx.stroke();

      // Draw pulse g(t/a)
      ctx.strokeStyle = '#22d3ee';
      ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const xLeft = tToX(-effTau);
      const xRight = tToX(effTau);
      const yPeak = valToY(ampA);

      if (pulseShape === 'rect') {
        ctx.moveTo(25, baseLine);
        ctx.lineTo(xLeft, baseLine);
        ctx.lineTo(xLeft, yPeak);
        ctx.lineTo(xRight, yPeak);
        ctx.lineTo(xRight, baseLine);
        ctx.lineTo(width - 25, baseLine);
      } else {
        ctx.moveTo(25, baseLine);
        ctx.lineTo(xLeft, baseLine);
        ctx.lineTo(midX, yPeak);
        ctx.lineTo(xRight, baseLine);
        ctx.lineTo(width - 25, baseLine);
      }
      ctx.stroke();
      ctx.fill();

      // Labels
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`-a·τ (${(-effTau).toFixed(2)}s)`, xLeft, baseLine + 16);
      ctx.fillText(`+a·τ (${effTau.toFixed(2)}s)`, xRight, baseLine + 16);
      ctx.fillText('0', midX, baseLine + 16);
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(`A = ${ampA.toFixed(1)}`, midX + 28, yPeak - 6);
    },
    [subTab, pulseShape, scaleA, ampA, effTau]
  );

  // Canvas 1A-2: Frequency Domain Spectrum |G(f)|
  const l1FreqCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const midX = width / 2;
      const baseLine = height - 32;
      const maxF = 3.5;
      const fToX = (f) => midX + (f / maxF) * (width * 0.44);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, baseLine);
      ctx.lineTo(width - 20, baseLine);
      ctx.moveTo(midX, 15);
      ctx.lineTo(midX, baseLine + 6);
      ctx.stroke();

      // Plot |G(f)|
      const samples = 400;
      const peakMag = pulseShape === 'rect' ? 2 * effTau * ampA : effTau * ampA;
      const normFactor = Math.max(2.5, peakMag);

      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.lineWidth = 2.5;

      for (let i = 0; i <= samples; i++) {
        const f = -maxF + (i / samples) * (2 * maxF);
        let gMag = 0;
        if (pulseShape === 'rect') {
          gMag = 2 * effTau * ampA * Math.abs(sinc(2 * f * effTau));
        } else {
          const s = sinc(f * effTau);
          gMag = effTau * ampA * (s * s);
        }
        const x = fToX(f);
        const y = baseLine - (gMag / normFactor) * (height - 55);
        if (i === 0) ctx.moveTo(x, baseLine);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(fToX(maxF), baseLine);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Highlight First-Null Bandwidth BW = W in positive frequency
      const xBw = fToX(firstNullBw);
      ctx.strokeStyle = '#10b981';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(midX, baseLine - 28);
      ctx.lineTo(xBw, baseLine - 28);
      ctx.moveTo(xBw, baseLine - 40);
      ctx.lineTo(xBw, baseLine + 4);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`BW = ${firstNullBw.toFixed(2)} Hz`, (midX + xBw) / 2, baseLine - 34);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('0 Hz', midX, baseLine + 16);
    },
    [subTab, pulseShape, scaleA, ampA, effTau, firstNullBw]
  );

  // Canvas 1B-1: LTI Time Domain x(t) and y(t)
  const l1LtiTimeRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const midY = height / 2;
      const samples = 400;

      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Harmonics: f1 = 1 Hz, f3 = 3 Hz, f5 = 5 Hz
      const amps =
        ltiInputType === 'multitone'
          ? [
              { f: 1, a: 1.0 },
              { f: 3, a: 0.6 },
              { f: 5, a: 0.4 }
            ]
          : [
              { f: 1, a: 1.27 },
              { f: 3, a: 1.27 / 3 },
              { f: 5, a: 1.27 / 5 }
            ];

      const passesFilter = (f) => {
        if (filterType === 'LPF') return f <= cutoffFreq;
        // BPF centered at 3 Hz with half-width 1.2 Hz
        return Math.abs(f - 3) <= 1.0;
      };

      // Draw input x(t) (dashed cyan)
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 2;
        let xVal = 0;
        amps.forEach((h) => {
          xVal += h.a * Math.sin(2 * Math.PI * h.f * t);
        });
        const px = (i / samples) * width;
        const py = midY - xVal * (height * 0.24);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw filtered output y(t) (solid emerald)
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 2;
        let yVal = 0;
        amps.forEach((h) => {
          if (passesFilter(h.f)) {
            yVal += h.a * Math.sin(2 * Math.PI * h.f * t);
          }
        });
        const px = (i / samples) * width;
        const py = midY - yVal * (height * 0.24);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    },
    [subTab, ltiInputType, filterType, cutoffFreq]
  );

  // Canvas 1B-2: LTI Frequency Domain Y(f) = X(f)H(f)
  const l1LtiFreqRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const baseLine = height - 28;
      const maxF = 6.5;
      const fToX = (f) => 40 + (f / maxF) * (width - 65);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(30, baseLine);
      ctx.lineTo(width - 20, baseLine);
      ctx.stroke();

      // Draw Filter H(f) box
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      if (filterType === 'LPF') {
        const xCut = fToX(cutoffFreq);
        ctx.fillRect(fToX(0), 22, xCut - fToX(0), baseLine - 22);
        ctx.strokeRect(fToX(0), 22, xCut - fToX(0), baseLine - 22);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(`H(f): Ideal LPF (f_c = ${cutoffFreq} Hz)`, fToX(0) + 10, 16);
      } else {
        const x1 = fToX(2.0);
        const x2 = fToX(4.0);
        ctx.fillRect(x1, 22, x2 - x1, baseLine - 22);
        ctx.strokeRect(x1, 22, x2 - x1, baseLine - 22);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText('H(f): Ideal BPF (Passes 3 Hz)', x1 - 10, 16);
      }
      ctx.restore();

      const harmonics =
        ltiInputType === 'multitone'
          ? [
              { f: 1, a: 1.0 },
              { f: 3, a: 0.6 },
              { f: 5, a: 0.4 }
            ]
          : [
              { f: 1, a: 1.0 },
              { f: 3, a: 0.33 },
              { f: 5, a: 0.2 }
            ];

      harmonics.forEach((h) => {
        const x = fToX(h.f);
        const passed =
          filterType === 'LPF' ? h.f <= cutoffFreq : Math.abs(h.f - 3) <= 1.0;
        const barH = h.a * (height - 62);

        ctx.strokeStyle = passed ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, baseLine);
        ctx.lineTo(x, baseLine - barH);
        ctx.stroke();

        ctx.fillStyle = passed ? '#10b981' : '#f43f5e';
        ctx.beginPath();
        ctx.arc(x, baseLine - barH, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${h.f} Hz (${passed ? 'Pass' : 'Blocked'})`, x, baseLine + 16);
      });
    },
    [subTab, ltiInputType, filterType, cutoffFreq]
  );

  // Canvas 1C: Octave FFT vs fftshift
  const l1OctaveCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const halfW = width / 2 - 15;
      const baseLine = height - 30;

      // Left Plot: Unshifted fft(y) [0 to fs - df]
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, baseLine);
      ctx.lineTo(halfW, baseLine);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('1. Raw fft(y): 0 to f_s - df (0 to 100 Hz)', halfW / 2 + 10, 16);

      const fToXRaw = (f) => 25 + (f / fs) * (halfW - 35);
      const xRaw1 = fToXRaw(sigFreq);
      const xRaw2 = fToXRaw(fs - sigFreq);

      [
        { x: xRaw1, label: `${sigFreq} Hz` },
        { x: xRaw2, label: `${fs - sigFreq} Hz (f_s - f_0)` }
      ].forEach((imp) => {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(imp.x, baseLine);
        ctx.lineTo(imp.x, baseLine - 80);
        ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(imp.x, baseLine - 80, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(imp.label, imp.x, baseLine + 15);
      });

      // Right Plot: Shifted fftshift(fft(y))/N [-0.5*fs to +0.5*fs - df]
      const rightStart = width / 2 + 15;
      const rightMid = rightStart + (width - 20 - rightStart) / 2;
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(rightStart, baseLine);
      ctx.lineTo(width - 20, baseLine);
      ctx.moveTo(rightMid, 24);
      ctx.lineTo(rightMid, baseLine + 5);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('2. Centered fftshift(fft(y))/N: Around 0 Hz', rightMid, 16);

      const fToXShift = (f) =>
        rightMid + (f / (fs / 2)) * ((width - 25 - rightStart) * 0.45);
      const xShiftNeg = fToXShift(-sigFreq);
      const xShiftPos = fToXShift(sigFreq);

      [
        { x: xShiftNeg, label: `-${sigFreq} Hz` },
        { x: xShiftPos, label: `+${sigFreq} Hz` }
      ].forEach((imp) => {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(imp.x, baseLine);
        ctx.lineTo(imp.x, baseLine - 80);
        ctx.stroke();
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(imp.x, baseLine - 80, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(imp.label, imp.x, baseLine + 15);
      });
      ctx.fillText('0 Hz', rightMid, baseLine + 15);
    },
    [subTab, NCount, sigFreq]
  );

  return (
    <div className="space-y-6">
      {/* Sub-navigation for Lecture 1 */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-cyan-400 font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            <Waves className="w-4 h-4" />
            Lecture 1: Introduction, Fourier Transform, Signal Bandwidth & Octave FFT
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Explore the inverse relationship between time duration and spectral bandwidth, LTI system filtering, and discrete Fourier Transform indexing in Octave/MATLAB.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700 shrink-0">
          <button
            onClick={() => setSubTab('scaling')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'scaling' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            1A. Time-BW Product & Parseval
          </button>
          <button
            onClick={() => setSubTab('lti')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'lti' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            1B. LTI System Filtering
          </button>
          <button
            onClick={() => setSubTab('octave')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'octave' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            1C. Octave FFT & fftshift
          </button>
        </div>
      </div>

      {/* SUB-TAB 1A: TIME-BANDWIDTH PRODUCT */}
      {subTab === 'scaling' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-5">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Pulse & Time-Scaling Controls (Slides 10–18)
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPulseShape('rect')}
                className={`p-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                  pulseShape === 'rect'
                    ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                Rectangular Pulse (sinc)
              </button>
              <button
                onClick={() => setPulseShape('tri')}
                className={`p-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                  pulseShape === 'tri'
                    ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                Triangular Pulse (sinc²)
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Time Scaling Factor (a) in g(t/a)</span>
                <span className="text-cyan-400 font-mono">a = {scaleA.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.1"
                value={scaleA}
                onChange={(e) => setScaleA(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Compressing pulse in time (<code className="text-cyan-300">a &lt; 1</code>) stretches its frequency bandwidth by <code className="text-amber-300">1/a</code>!
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Pulse Amplitude (A)</span>
                <span className="text-amber-400 font-mono">A = {ampA.toFixed(1)} V</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={ampA}
                onChange={(e) => setAmpA(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Pulse Duration (2·a·τ):</span>
                <span className="font-mono text-cyan-300">{(2 * effTau).toFixed(2)} sec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Signal Bandwidth (BW = W/a):</span>
                <span className="font-mono text-emerald-400">{firstNullBw.toFixed(2)} Hz</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5">
                <span className="text-slate-200 font-semibold">Time-BW Product (Dur × BW):</span>
                <span className="font-mono font-bold text-amber-300">
                  {tbProduct.toFixed(2)} (Constant!)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Parseval&apos;s Energy E = ∫|g(t)|²dt:</span>
                <span className="font-mono text-purple-300">{energyParseval.toFixed(2)} J</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-2">
                Time Domain: g(t/a)
              </div>
              <canvas ref={l1TimeCanvasRef} className="w-full h-56 block" />
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">
                Frequency Domain: |a|·|G(a·f)|
              </div>
              <canvas ref={l1FreqCanvasRef} className="w-full h-56 block" />
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 1B: LTI SYSTEM FILTERING */}
      {subTab === 'lti' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              LTI System: y(t) = x(t)*h(t) ↔ Y(f) = X(f)H(f)
            </h3>

            <div>
              <div className="text-xs text-slate-400 mb-1.5">Input Signal x(t) (1 Hz + 3 Hz + 5 Hz):</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLtiInputType('multitone')}
                  className={`p-2 rounded text-xs font-semibold border cursor-pointer ${
                    ltiInputType === 'multitone'
                      ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  3-Tone Audio Sum
                </button>
                <button
                  onClick={() => setLtiInputType('square')}
                  className={`p-2 rounded text-xs font-semibold border cursor-pointer ${
                    ltiInputType === 'square'
                      ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  Square Wave Harmonics
                </button>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400 mb-1.5">LTI Filter Frequency Response H(f):</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFilterType('LPF')}
                  className={`p-2 rounded text-xs font-semibold border cursor-pointer ${
                    filterType === 'LPF'
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  Low-Pass Filter (LPF)
                </button>
                <button
                  onClick={() => setFilterType('BPF')}
                  className={`p-2 rounded text-xs font-semibold border cursor-pointer ${
                    filterType === 'BPF'
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  Band-Pass @ 3 Hz (BPF)
                </button>
              </div>
            </div>

            {filterType === 'LPF' && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">LPF Cutoff Frequency (f_c)</span>
                  <span className="text-sky-400 font-mono">{cutoffFreq.toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="5.8"
                  step="0.5"
                  value={cutoffFreq}
                  onChange={(e) => setCutoffFreq(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300">
              In an LTI system (Slides 19–21), convolution in time <code className="text-cyan-300">y(t) = x(t)*h(t)</code> becomes simple multiplication in frequency: <code className="text-emerald-300">Y(f) = X(f)·H(f)</code>.
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold uppercase text-slate-300">
                  1. Frequency Domain Multiplication: Y(f) = X(f) · H(f)
                </span>
                <span className="text-sky-400">Dashed Box = Filter Passband H(f)</span>
              </div>
              <canvas ref={l1LtiFreqRef} className="w-full h-36 block" />
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold uppercase text-slate-300">
                  2. Time Domain Waveforms: Input x(t) vs. Filtered Output y(t)
                </span>
                <div className="flex gap-4">
                  <span className="text-cyan-300">--- Input x(t)</span>
                  <span className="text-emerald-400 font-semibold">─── Output y(t)</span>
                </div>
              </div>
              <canvas ref={l1LtiTimeRef} className="w-full h-36 block" />
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 1C: OCTAVE FFT & FFTSHIFT */}
      {subTab === 'octave' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              Octave / MATLAB FFT & fftshift (Slides 26–28)
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setNCount(64)}
                className={`p-2 rounded text-xs font-semibold border cursor-pointer ${
                  NCount % 2 === 0
                    ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                N = 64 (Even Length)
              </button>
              <button
                onClick={() => setNCount(63)}
                className={`p-2 rounded text-xs font-semibold border cursor-pointer ${
                  NCount % 2 !== 0
                    ? 'bg-amber-600/30 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                N = 63 (Odd Length)
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Sine Wave Frequency (f_0)</span>
                <span className="text-emerald-400 font-mono">{sigFreq} Hz (f_s = 100 Hz)</span>
              </div>
              <input
                type="range"
                min="4"
                max="35"
                step="1"
                value={sigFreq}
                onChange={(e) => setSigFreq(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Live Octave Code Snippet from Lecture 1 Slide 28 */}
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`%%%% Time domain (Lecture 1 Slide 28) %%%%
ts = ${ts}; N = ${NCount};
t = 0 : ts : ((N-1)*ts);
T = N*ts; % T = ${totalT.toFixed(2)}s
y = sin(2*pi*${sigFreq}*t);

%%%% Frequency domain %%%%
df = 1/T; % df = ${df.toFixed(2)} Hz
fs = 1/ts; % fs = ${fs} Hz
${
  NCount % 2 === 0
    ? `f = -(0.5*fs) : df : (0.5*fs - df); % N is EVEN`
    : `f = -(0.5*fs-0.5*df) : df : (0.5*fs-0.5*df); % N is ODD`
}
Y = fftshift(fft(y)) / N;`}
            </pre>
          </div>

          <div className="lg:col-span-7 bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Why We Need fftshift(fft(y)) in Octave/MATLAB (Slide 27)
            </div>
            <canvas ref={l1OctaveCanvasRef} className="w-full h-56 block" />
            <p className="text-xs text-slate-400 mt-2">
              Raw <code className="text-amber-300">fft(y)</code> defines frequencies from <code className="font-mono">0</code> to <code className="font-mono">f_s - df</code>, placing negative frequencies at the upper end (<code className="text-amber-300">{fs - sigFreq} Hz</code>). Applying <code className="text-emerald-300">fftshift</code> centers the spectrum symmetrically around <code className="font-mono">0 Hz</code> (<code className="text-emerald-300">±{sigFreq} Hz</code>).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LECTURE 2 MODULE: AMPLITUDE MODULATION (FULL AM, DSB-SC, SSB, VSB, RC, QAM)
// ============================================================================
function Lecture2Lab() {
  const [subTab, setSubTab] = useState('schemes'); // 'schemes' | 'envelope' | 'qam'

  // --- Sub-tab 2A State: AM Schemes & Overmodulation ---
  const [amType, setAmType] = useState('FULL_AM'); // 'FULL_AM' | 'DSB_SC' | 'SSB_USB' | 'SSB_LSB' | 'VSB'
  const [modIndex, setModIndex] = useState(0.7); // ka * Am (Overmodulated if > 1.0)
  const [fcRatio, setFcRatio] = useState(10); // Carrier frequency relative to message W

  // --- Sub-tab 2B State: Envelope Detector RC Time Constant ---
  const [rcTau, setRcTau] = useState(0.35); // Normalized R_L * C

  // --- Sub-tab 2C State: QAM Transceiver ---
  const [qamPhaseErr, setQamPhaseErr] = useState(0); // Degrees of Rx phase error in QAM

  // Canvas 2A-1: Time-Domain Modulated Wave s(t) & Envelope
  const l2TimeRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const midY = height / 2;
      const samples = 500;
      const scaleY = height * 0.22;

      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Modulated signal s(t)
      ctx.beginPath();
      ctx.strokeStyle =
        amType === 'FULL_AM' && modIndex > 1.0 ? '#f43f5e' : '#22d3ee';
      ctx.lineWidth = 2;

      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 4 * Math.PI;
        const m = Math.cos(t); // Baseband message cos(t)
        const mHilbert = Math.sin(t); // Hilbert transform sin(t) for SSB
        let s = 0;

        if (amType === 'FULL_AM') {
          s = (1 + modIndex * m) * Math.cos(fcRatio * t);
        } else if (amType === 'DSB_SC') {
          s = modIndex * m * Math.cos(fcRatio * t) * 1.4;
        } else if (amType === 'SSB_USB') {
          s = modIndex * (m * Math.cos(fcRatio * t) - mHilbert * Math.sin(fcRatio * t));
        } else if (amType === 'SSB_LSB') {
          s = modIndex * (m * Math.cos(fcRatio * t) + mHilbert * Math.sin(fcRatio * t));
        } else {
          // VSB
          s = modIndex * (m * Math.cos(fcRatio * t) - 0.65 * mHilbert * Math.sin(fcRatio * t));
        }

        const x = (i / samples) * width;
        const y = midY - s * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Upper Envelope for Full AM or DSB-SC
      if (amType === 'FULL_AM' || amType === 'DSB_SC') {
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        for (let i = 0; i < samples; i++) {
          const t = (i / samples) * 4 * Math.PI;
          const m = Math.cos(t);
          const env =
            amType === 'FULL_AM'
              ? 1 + modIndex * m
              : Math.abs(modIndex * m * 1.4);
          const x = (i / samples) * width;
          const y = midY - env * scaleY;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [subTab, amType, modIndex, fcRatio]
  );

  // Canvas 2A-2: Frequency Spectrum S(f) (Slide 8, 15, 26, 29)
  const l2SpecRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const baseLine = height - 30;
      const midX = width / 2;

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, baseLine);
      ctx.lineTo(width - 20, baseLine);
      ctx.moveTo(midX, 15);
      ctx.lineTo(midX, baseLine + 5);
      ctx.stroke();

      const fcXOffset = Math.min(width * 0.28, (fcRatio / 14) * (width * 0.3));
      const bwPx = 42;
      const sideH = Math.min(80, modIndex * 55);

      const drawSidebands = (centerX, isPositiveFreq) => {
        // LSB and USB around +fc (or mirrored around -fc)
        const usbSign = isPositiveFreq ? 1 : -1;
        const lsbSign = -usbSign;

        // Draw USB triangle
        if (amType !== 'SSB_LSB') {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(centerX, baseLine);
          ctx.lineTo(centerX + usbSign * (bwPx * 0.4), baseLine - sideH);
          ctx.lineTo(centerX + usbSign * bwPx, baseLine);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Draw LSB triangle (full or vestigial)
        if (amType !== 'SSB_USB') {
          const factor = amType === 'VSB' ? 0.32 : 1.0;
          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(centerX, baseLine);
          ctx.lineTo(centerX + lsbSign * (bwPx * 0.4 * factor), baseLine - sideH * factor);
          ctx.lineTo(centerX + lsbSign * (bwPx * factor), baseLine);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Carrier impulse for Full AM
        if (amType === 'FULL_AM') {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(centerX, baseLine);
          ctx.lineTo(centerX, baseLine - 90);
          ctx.stroke();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(centerX, baseLine - 90, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      };

      drawSidebands(midX + fcXOffset, true);
      drawSidebands(midX - fcXOffset, false);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+f_c', midX + fcXOffset, baseLine + 16);
      ctx.fillText('-f_c', midX - fcXOffset, baseLine + 16);
      ctx.fillText('0', midX, baseLine + 16);
    },
    [subTab, amType, modIndex, fcRatio]
  );

  // Canvas 2B: Envelope Detector Capacitor Charging/Discharging (Slides 11-13)
  const l2EnvCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const midY = height / 2 + 15;
      const scaleY = height * 0.32;
      const samples = 600;

      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Modulated AM carrier s(t) (faint cyan)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
      ctx.lineWidth = 1.5;
      const sArr = [];
      const idealEnvArr = [];

      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 3 * Math.PI;
        const env = 1 + 0.55 * Math.cos(t);
        const s = env * Math.cos(14 * t);
        sArr.push(s);
        idealEnvArr.push(env);
        const x = (i / samples) * width;
        const y = midY - s * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Ideal Envelope (dashed amber)
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < samples; i++) {
        const x = (i / samples) * width;
        const y = midY - idealEnvArr[i] * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Capacitor Output Vo(t) with exponential decay exp(-dt / rcTau)
      ctx.beginPath();
      ctx.strokeStyle =
        rcTau < 0.18 || rcTau > 0.65 ? '#f43f5e' : '#10b981';
      ctx.lineWidth = 2.8;
      let vCap = 0;
      const dt = (3 * Math.PI) / samples;
      const effTauDecay = Math.pow(rcTau, 1.8) * 6.5;

      for (let i = 0; i < samples; i++) {
        if (sArr[i] > vCap) {
          vCap = sArr[i]; // Diode ON -> Fast charging
        } else {
          vCap = vCap * Math.exp(-dt / Math.max(0.04, effTauDecay)); // Diode OFF -> Discharging via R_L*C
        }
        const x = (i / samples) * width;
        const y = midY - vCap * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },
    [subTab, rcTau]
  );

  // Canvas 2C: QAM Orthogonal Demodulation (Slides 20-24)
  const l2QamCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const halfH = height / 2;
      const samples = 350;
      const radErr = (qamPhaseErr * Math.PI) / 180;

      // Divider
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(width, halfH);
      ctx.stroke();

      // Upper Path: m1(t) (Cosine channel)
      // Rx Upper LPF output = m1(t)*cos(err) - m2(t)*sin(err)
      const drawChannel = (yCenter, isUpper) => {
        // Ideal original message (dashed)
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isUpper ? '#22d3ee' : '#a855f7';
        ctx.lineWidth = 1.8;
        for (let i = 0; i < samples; i++) {
          const t = (i / samples) * 2 * Math.PI;
          const m1 = Math.sin(t);
          const m2 = 0.8 * Math.cos(2 * t);
          const orig = isUpper ? m1 : m2;
          const x = (i / samples) * width;
          const y = yCenter - orig * (halfH * 0.34);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Recovered Output
        ctx.beginPath();
        ctx.strokeStyle = Math.abs(qamPhaseErr) > 5 ? '#f43f5e' : '#10b981';
        ctx.lineWidth = 2.5;
        for (let i = 0; i < samples; i++) {
          const t = (i / samples) * 2 * Math.PI;
          const m1 = Math.sin(t);
          const m2 = 0.8 * Math.cos(2 * t);
          const rec = isUpper
            ? m1 * Math.cos(radErr) + m2 * Math.sin(radErr)
            : m2 * Math.cos(radErr) - m1 * Math.sin(radErr);
          const x = (i / samples) * width;
          const y = yCenter - rec * (halfH * 0.34);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawChannel(halfH * 0.52, true);
      drawChannel(halfH * 1.52, false);

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('Upper Path Output: m₁(t) [In-Phase Cosine Channel]', 12, 16);
      ctx.fillStyle = '#c084fc';
      ctx.fillText('Lower Path Output: m₂(t) [Quadrature Sine Channel]', 12, halfH + 16);
    },
    [subTab, qamPhaseErr]
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-cyan-400 font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Lecture 2: Amplitude Modulation (Full AM, DSB-SC, SSB, VSB, Envelope & QAM)
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Compare AM variants, test envelope detector RC charging/discharging conditions, and explore 2-channel Quadrature Amplitude Multiplexing (QAM).
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700 shrink-0">
          <button
            onClick={() => setSubTab('schemes')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'schemes' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            2A. AM, DSB-SC, SSB & VSB
          </button>
          <button
            onClick={() => setSubTab('envelope')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'envelope' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            2B. Envelope Detector RC
          </button>
          <button
            onClick={() => setSubTab('qam')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'qam' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            2C. QAM Transceiver
          </button>
        </div>
      </div>

      {/* SUB-TAB 2A: AM SCHEMES & OVERMODULATION */}
      {subTab === 'schemes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm">Select Amplitude Modulation Scheme</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'FULL_AM', label: 'Full AM (DSB-FC)', bw: '2W' },
                { id: 'DSB_SC', label: 'DSB-SC (No Carrier)', bw: '2W' },
                { id: 'SSB_USB', label: 'SSB (Upper Sideband)', bw: 'W' },
                { id: 'SSB_LSB', label: 'SSB (Lower Sideband)', bw: 'W' },
                { id: 'VSB', label: 'VSB (Vestigial Sideband)', bw: 'W + fv' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setAmType(s.id)}
                  className={`p-2 rounded-lg text-left border text-xs transition cursor-pointer ${
                    amType === s.id
                      ? 'bg-cyan-600/30 border-cyan-400 text-cyan-100 font-bold'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <div>{s.label}</div>
                  <div className="text-[10px] text-amber-400 font-mono">BW = {s.bw}</div>
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Modulation Sensitivity (k_a · A_m)</span>
                <span className="font-mono text-amber-400">{(modIndex * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.5"
                step="0.05"
                value={modIndex}
                onChange={(e) => setModIndex(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Carrier Speed Ratio (f_c / W)</span>
                <span className="font-mono text-cyan-400">{fcRatio}× W</span>
              </div>
              <input
                type="range"
                min="1"
                max="16"
                step="1"
                value={fcRatio}
                onChange={(e) => setFcRatio(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Lecture 2 Slide 9 Condition Checks */}
            <div
              className={`p-3 rounded-lg border text-xs ${
                (amType === 'FULL_AM' && modIndex > 1.0) || fcRatio <= 2
                  ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                  : 'bg-emerald-950/50 border-emerald-600/70 text-emerald-200'
              }`}
            >
              {amType === 'FULL_AM' && modIndex > 1.0 ? (
                <div>
                  <strong>⚠️ Overmodulation & Phase Reversal (Slide 9):</strong> Because <code className="font-mono">1 + k_a·m(t) &lt; 0</code>, the carrier reverses phase and an Envelope Detector gets distorted!
                </div>
              ) : fcRatio <= 2 ? (
                <div>
                  <strong>⚠️ Carrier Too Slow (f_c ≤ W, Slide 9):</strong> Sidebands overlap around 0 Hz and the envelope no longer resembles <code className="font-mono">m(t)</code>!
                </div>
              ) : (
                <div>
                  <strong>✓ Valid Modulation Conditions:</strong>{' '}
                  {amType === 'FULL_AM'
                    ? '1 + k_a·m(t) > 0 and f_c >> W (Can use simple Envelope Detector).'
                    : 'Suppressed carrier saves power/bandwidth; requires Coherent Detector.'}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold uppercase text-slate-300">
                  1. Time-Domain Modulated Waveform s(t)
                </span>
                <span className="text-amber-400">--- Envelope</span>
              </div>
              <canvas ref={l2TimeRef} className="w-full h-40 block" />
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="flex justify-between text-xs mb-2">
                <span className="font-semibold uppercase text-slate-300">
                  2. Frequency Spectrum S(f) (LSB = Blue, USB = Green, Carrier = Amber)
                </span>
              </div>
              <canvas ref={l2SpecRef} className="w-full h-36 block" />
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2B: ENVELOPE DETECTOR RC SIMULATOR */}
      {subTab === 'envelope' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm">
              Envelope Detector Discharge Time Constant (Slides 11–13)
            </h3>
            <p className="text-xs text-slate-300">
              For proper envelope detection of Full AM, the capacitor discharge time constant{' '}
              <code className="text-amber-300 font-mono">τ_d = R_L · C</code> must satisfy:
            </p>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 text-center font-mono text-sm text-cyan-300">
              1 / f_c ≪ R_L · C ≪ 1 / W
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Discharge Constant (τ_d = R_L·C)</span>
                <span className="text-emerald-400 font-mono">{rcTau.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.08"
                max="0.9"
                step="0.02"
                value={rcTau}
                onChange={(e) => setRcTau(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => setRcTau(0.1)}
                className="p-2 bg-slate-900 hover:bg-slate-700 rounded border border-slate-700 text-rose-300 cursor-pointer"
              >
                Too Small (Ripple)
              </button>
              <button
                onClick={() => setRcTau(0.35)}
                className="p-2 bg-slate-900 hover:bg-slate-700 rounded border border-slate-700 text-emerald-300 cursor-pointer"
              >
                Optimal R_L·C
              </button>
              <button
                onClick={() => setRcTau(0.82)}
                className="p-2 bg-slate-900 hover:bg-slate-700 rounded border border-slate-700 text-amber-300 cursor-pointer"
              >
                Too Large (Clipping)
              </button>
            </div>

            <div
              className={`p-3 rounded-lg border text-xs ${
                rcTau < 0.18 || rcTau > 0.65
                  ? 'bg-rose-950/50 border-rose-600 text-rose-200'
                  : 'bg-emerald-950/50 border-emerald-600 text-emerald-200'
              }`}
            >
              {rcTau < 0.18
                ? '⚠️ R_L·C Too Small (≈ 1/f_c): Capacitor discharges too fast between carrier peaks, creating jagged carrier ripple!'
                : rcTau > 0.65
                ? '⚠️ R_L·C Too Large (≥ 1/W): Capacitor discharges too slowly and misses downward slopes of m(t) (Diagonal Clipping)!'
                : '✓ Ideal R_L·C: Slow enough to bridge carrier peaks (>> 1/f_c), yet fast enough to track message valleys (<< 1/W).'}
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold uppercase text-slate-300">
                Capacitor Voltage V_o(t) Tracking Carrier Peaks
              </span>
              <div className="flex gap-4">
                <span className="text-amber-400">--- Ideal Envelope</span>
                <span className="text-emerald-400 font-bold">─── Capacitor Output V_o(t)</span>
              </div>
            </div>
            <canvas ref={l2EnvCanvasRef} className="w-full h-64 block" />
          </div>
        </div>
      )}

      {/* SUB-TAB 2C: QAM TRANSCEIVER */}
      {subTab === 'qam' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm">
              Quadrature Amplitude Multiplexing (Slides 20–24)
            </h3>
            <p className="text-xs text-slate-300">
              QAM transmits <strong>two independent messages</strong> <code className="text-cyan-300">m₁(t)</code> and <code className="text-purple-300">m₂(t)</code> on the <strong>exact same frequency band</strong> using orthogonal carriers:
            </p>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 font-mono text-xs text-amber-300">
              s(t) = A_c·m₁(t)cos(2πf_ct) + A_c·m₂(t)sin(2πf_ct)
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Receiver Oscillator Phase Error (φ)</span>
                <span className="text-cyan-400 font-mono">{qamPhaseErr}°</span>
              </div>
              <input
                type="range"
                min="-45"
                max="45"
                step="5"
                value={qamPhaseErr}
                onChange={(e) => setQamPhaseErr(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                When <code className="text-emerald-300">φ = 0°</code>, cosine and sine are strictly orthogonal and both channels separate cleanly. Any phase error causes cross-talk between <code className="text-cyan-300">m₁(t)</code> and <code className="text-purple-300">m₂(t)</code>!
              </p>
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold uppercase text-slate-300">
                Demodulated QAM Channels After LPF (Upper = Cosine Mixer, Lower = Sine Mixer)
              </span>
              <span className="text-emerald-400">Solid = Recovered, Dashed = Original</span>
            </div>
            <canvas ref={l2QamCanvasRef} className="w-full h-64 block" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LECTURE 3 MODULE: ANGLE MODULATION (PM vs FM, BESSEL & BANDWIDTH)
// ============================================================================
function Lecture3Lab() {
  const [subTab, setSubTab] = useState('waveforms'); // 'waveforms' | 'bessel'

  // --- Sub-tab 3A State: AM vs PM vs FM Waveform Explorer ---
  const [msgShape, setMsgShape] = useState('sine'); // 'sine' (Slide 6) | 'ramp' (Slide 7)
  const [sensScale, setSensScale] = useState(1.2); // Sensitivity multiplier

  // --- Sub-tab 3B State: Bessel Spectrum & Carson vs Universal Curve ---
  const [beta, setBeta] = useState(2.0); // Modulation index beta = delta_f / fm
  const [fmKhz, setFmKhz] = useState(15); // Message frequency fm in kHz

  // Compute Bessel sidebands J_n(beta) for n = 0..14
  const besselData = useMemo(() => {
    const coeffs = [];
    let nMaxUniversal = 1;
    for (let n = 0; n <= 16; n++) {
      const val = besselJ(n, beta);
      coeffs.push({ n, val, absVal: Math.abs(val) });
      if (Math.abs(val) > 0.01) {
        nMaxUniversal = n;
      }
    }
    const deltaF = beta * fmKhz;
    const carsonBw = 2 * fmKhz * (1 + beta);
    const universalBw = 2 * nMaxUniversal * fmKhz;
    const totalPowerRatio =
      coeffs[0].val * coeffs[0].val +
      2 * coeffs.slice(1).reduce((acc, c) => acc + c.val * c.val, 0);

    return {
      coeffs,
      nMaxUniversal,
      deltaF,
      carsonBw,
      universalBw,
      totalPowerRatio
    };
  }, [beta, fmKhz]);

  // Canvas 3A: 4-Track Synchronized Plot (m(t), DSB-SC, FM, PM) - Lecture 3 Slides 6 & 7
  const l3WaveformsRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const rows = [
        { title: '1. Message m(t) & Slope dm(t)/dt', color: '#22d3ee' },
        { title: '2. DSB-SC: Ac·m(t)·sin(2πf_ct)', color: '#f59e0b' },
        { title: '3. FM: f_i(t) = f_c + k_f·m(t)', color: '#10b981' },
        { title: '4. PM: f_i(t) = f_c + (k_p/2π)·dm(t)/dt', color: '#a855f7' }
      ];
      const rowH = height / 4;
      const samples = 550;

      rows.forEach((r, idx) => {
        const yMid = rowH * idx + rowH * 0.55;
        ctx.strokeStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, yMid);
        ctx.lineTo(width, yMid);
        ctx.stroke();

        ctx.fillStyle = r.color;
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(r.title, 10, rowH * idx + 15);
      });

      // Vertical t = 0 line for Ramp mode (Slide 7)
      if (msgShape === 'ramp') {
        ctx.save();
        ctx.strokeStyle = '#475569';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(width * 0.35, 0);
        ctx.lineTo(width * 0.35, height);
        ctx.stroke();
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('t = 0 (Ramp Starts: m(t) = a·t)', width * 0.35 + 6, 14);
        ctx.restore();
      }

      // Draw each of the 4 tracks
      for (let track = 0; track < 4; track++) {
        const yMid = rowH * track + rowH * 0.55;
        const amp = rowH * 0.34;
        ctx.beginPath();
        ctx.strokeStyle = rows[track].color;
        ctx.lineWidth = 2;

        for (let i = 0; i < samples; i++) {
          const u = i / samples; // 0 to 1
          const x = u * width;
          let yVal = 0;

          if (msgShape === 'sine') {
            // Slide 6: m(t) = cos(2*pi*fm*t)
            const t = u * 4 * Math.PI;
            const m = Math.cos(t);
            if (track === 0) yVal = m;
            else if (track === 1) yVal = m * Math.sin(10 * t);
            else if (track === 2) {
              // FM: integral of cos(t) is sin(t)
              yVal = Math.sin(10 * t + 4.5 * sensScale * Math.sin(t));
            } else {
              // PM: phase varies directly with cos(t) -> max freq at steepest downward slope -sin(t)
              yVal = Math.sin(10 * t + 4.5 * sensScale * Math.cos(t));
            }
          } else {
            // Slide 7: m(t) = 0 for t < 0, a*t for t > 0
            const t = (u - 0.35) * 10;
            const m = t < 0 ? 0 : t / 6.5;
            if (track === 0) yVal = m * 1.3 - 0.3;
            else if (track === 1) yVal = m * Math.sin(8 * t);
            else if (track === 2) {
              // FM: instantaneous frequency increases linearly with t (phase ~ 0.5*a*t^2)
              const phase = t < 0 ? 7 * t : 7 * t + 2.2 * sensScale * t * t;
              yVal = Math.sin(phase);
            } else {
              // PM: instantaneous frequency jumps to a higher CONSTANT frequency for t > 0!
              const phase = t < 0 ? 7 * t : (7 + 9 * sensScale) * t;
              yVal = Math.sin(phase);
            }
          }

          const py = yMid - yVal * amp;
          if (i === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
        ctx.stroke();
      }
    },
    [subTab, msgShape, sensScale]
  );

  // Canvas 3B: Bessel Line Spectrum S(f) at fc +/- n*fm (Slide 17-20)
  const l3BesselRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const baseLine = height - 32;
      const midX = width / 2;
      const maxHarmonics = 14;
      const stepX = (width * 0.44) / maxHarmonics;

      // Axis
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, baseLine);
      ctx.lineTo(width - 20, baseLine);
      ctx.stroke();

      // Draw Carson's BW vs Universal Curve BW brackets
      const carsonHalfPx = ((besselData.carsonBw / 2) / fmKhz) * stepX;
      const univHalfPx = besselData.nMaxUniversal * stepX;

      // Carson Box
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(
        midX - carsonHalfPx,
        28,
        2 * carsonHalfPx,
        baseLine - 28
      );
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Carson's Rule BW = ${besselData.carsonBw.toFixed(0)} kHz`,
        midX,
        22
      );
      ctx.restore();

      // Universal Curve Marker
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(midX - univHalfPx, 42);
      ctx.lineTo(midX + univHalfPx, 42);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `1% Universal BW (2·n_max·f_m = ${besselData.universalBw.toFixed(0)} kHz)`,
        midX,
        39
      );
      ctx.restore();

      // Plot each Bessel impulse |J_n(beta)| around f_c
      for (let n = -maxHarmonics; n <= maxHarmonics; n++) {
        const absN = Math.abs(n);
        const coeff = besselData.coeffs[absN];
        if (!coeff) continue;

        const x = midX + n * stepX;
        const barH = coeff.absVal * (height - 82);
        const isSignificant = coeff.absVal > 0.01;

        ctx.strokeStyle =
          n === 0 ? '#f59e0b' : isSignificant ? '#10b981' : '#475569';
        ctx.lineWidth = n === 0 ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(x, baseLine);
        ctx.lineTo(x, baseLine - Math.max(2, barH));
        ctx.stroke();

        ctx.fillStyle =
          n === 0 ? '#f59e0b' : isSignificant ? '#10b981' : '#475569';
        ctx.beginPath();
        ctx.arc(x, baseLine - Math.max(2, barH), 3.5, 0, 2 * Math.PI);
        ctx.fill();

        if (absN <= 6 || absN % 2 === 0) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(n === 0 ? 'f_c' : `${n > 0 ? '+' : ''}${n}`, x, baseLine + 14);
        }
      }
    },
    [subTab, beta, fmKhz, besselData]
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-cyan-400 font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4" />
            Lecture 3: Angle Modulation (PM vs. FM, Bessel Functions & Carson&apos;s Rule)
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Compare instantaneous frequency in PM vs. FM and inspect how Bessel functions <code className="text-emerald-300">J_n(β)</code> govern Wideband FM sidebands and bandwidth.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700 shrink-0">
          <button
            onClick={() => setSubTab('waveforms')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'waveforms' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            3A. AM vs. PM vs. FM Waveforms
          </button>
          <button
            onClick={() => setSubTab('bessel')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'bessel' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            3B. Bessel J_n(β) & FM Bandwidth
          </button>
        </div>
      </div>

      {/* SUB-TAB 3A: AM vs PM vs FM WAVEFORMS */}
      {subTab === 'waveforms' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm">
              Message Signal Selection (Slides 6 & 7)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMsgShape('sine')}
                className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  msgShape === 'sine'
                    ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                Cosine Wave (Slide 6)
              </button>
              <button
                onClick={() => setMsgShape('ramp')}
                className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  msgShape === 'ramp'
                    ? 'bg-amber-600/30 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                Linear Ramp a·t (Slide 7)
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Sensitivity (k_f / k_p)</span>
                <span className="text-cyan-400 font-mono">{sensScale.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.2"
                step="0.2"
                value={sensScale}
                onChange={(e) => setSensScale(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 space-y-2 text-xs text-slate-300">
              <div className="font-bold text-cyan-400">Key Insight (Slides 4–8):</div>
              <div>
                • <strong>FM Instantaneous Freq:</strong>{' '}
                <code className="text-emerald-300 font-mono">f_FM(t) = f_c + k_f·m(t)</code>
              </div>
              <div>
                • <strong>PM Instantaneous Freq:</strong>{' '}
                <code className="text-purple-300 font-mono">f_PM(t) = f_c + (k_p/2π)·dm(t)/dt</code>
              </div>
              {msgShape === 'ramp' ? (
                <p className="text-amber-300 pt-1">
                  For a linear ramp <code className="font-mono">m(t) = a·t</code> (<code className="font-mono">t &gt; 0</code>), FM frequency increases linearly with time, whereas PM frequency jumps to a constant <code className="font-mono">f_c + (k_p/2π)a</code> because the slope is constant!
                </p>
              ) : (
                <p className="text-slate-400 pt-1">
                  For a cosine message, FM reaches maximum frequency at the peak of <code className="font-mono">m(t)</code>, while PM reaches maximum frequency at the zero-crossings where slope <code className="font-mono">dm/dt</code> is steepest!
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <canvas ref={l3WaveformsRef} className="w-full h-80 block" />
          </div>
        </div>
      )}

      {/* SUB-TAB 3B: BESSEL SPECTRUM & CARSON VS UNIVERSAL BW */}
      {subTab === 'bessel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm">
              FM Modulation Index β & Bandwidth (Slides 11–21)
            </h3>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Modulation Index (β = Δf / f_m)</span>
                <span className="text-emerald-400 font-mono font-bold">
                  β = {beta.toFixed(1)} ({beta < 0.5 ? 'Narrowband FM' : 'Wideband FM'})
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10.0"
                step="0.1"
                value={beta}
                onChange={(e) => setBeta(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {[0.2, 1.0, 2.4, 5.0].map((val) => (
                <button
                  key={val}
                  onClick={() => setBeta(val)}
                  className="p-1.5 bg-slate-900 hover:bg-slate-700 rounded border border-slate-700 text-slate-300 font-mono cursor-pointer"
                >
                  β = {val === 2.4 ? '2.4 (J₀≈0)' : val}
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Baseband Freq (f_m or W)</span>
                <span className="text-cyan-400 font-mono">{fmKhz} kHz</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="5"
                value={fmKhz}
                onChange={(e) => setFmKhz(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Freq. Deviation (Δf = β·f_m):</span>
                <span className="font-mono text-white">{besselData.deltaF.toFixed(1)} kHz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-300 font-semibold">Carson&apos;s Rule BW = 2f_m(1+β):</span>
                <span className="font-mono font-bold text-amber-400">
                  {besselData.carsonBw.toFixed(1)} kHz
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sky-300 font-semibold">
                  1% Universal Curve (2·n_max·f_m):
                </span>
                <span className="font-mono font-bold text-sky-400">
                  {besselData.universalBw.toFixed(1)} kHz (2n_max={2 * besselData.nMaxUniversal})
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5">
                <span className="text-slate-400">Bessel Sum ∑ J_n²(β):</span>
                <span className="font-mono text-emerald-400">
                  {besselData.totalPowerRatio.toFixed(3)} (Constant Power!)
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-semibold uppercase text-slate-300">
                Wideband FM Bessel Spectrum |J_n(β)| Around Carrier f_c (Spacing = f_m)
              </span>
              <span className="text-emerald-400 font-mono">
                J₀({beta.toFixed(1)}) = {besselData.coeffs[0].val.toFixed(2)}, J₁({beta.toFixed(1)}) ={' '}
                {besselData.coeffs[1].val.toFixed(2)}
              </span>
            </div>
            <canvas ref={l3BesselRef} className="w-full h-64 block" />
            <p className="text-xs text-slate-400 mt-2">
              Try clicking <code className="text-amber-300 font-mono">β = 2.4 (J₀≈0)</code> to see the carrier component at <code className="font-mono">f_c</code> completely vanish as all carrier power transfers into the sidebands, or set <code className="text-emerald-300 font-mono">β = 5, f_m = 15 kHz</code> to verify <strong>Haykin Example 4.4 (Slide 21)</strong>: Carson BW = 180 kHz vs. Universal Curve = 240 kHz!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LECTURE 4 MODULE: ANGLE MODULATORS & DEMODULATORS
// ============================================================================
function Lecture4Lab() {
  const [subTab, setSubTab] = useState('armstrong'); // 'armstrong' | 'demod'

  // --- Sub-tab 4A State: Indirect FM (Armstrong) Modulator & Haykin Problem 2.37 ---
  // Default loaded with Haykin Problem 2.37 (Lecture 4 Slide 7)
  const [n1, setN1] = useState(75);
  const [n2, setN2] = useState(50);
  const [fLoMhz, setFLoMhz] = useState(9.5);
  const fc1Mhz = 0.1; // Point A: 0.1 MHz crystal oscillator
  const df1Hz = 20; // Point A: beta_min * W_min = 0.2 * 100 Hz = 20 Hz

  // Point B (after Multiplier n1)
  const fcBMhz = fc1Mhz * n1;
  const dfBHz = df1Hz * n1;

  // Point C (after Mixer with f_LO)
  const fcCMhz = Math.abs(fLoMhz - fcBMhz);
  const dfCHz = dfBHz; // Mixer shifts fc ONLY, leaving delta_f unchanged!

  // Point D (Output after Multiplier n2)
  const fcDMhz = fcCMhz * n2;
  const dfDKhz = (dfCHz * n2) / 1000;

  // --- Sub-tab 4B State: Differentiator + Envelope Detector FM Demodulator ---
  const [fmDevDemo, setFmDevDemo] = useState(1.0);

  // Canvas 4B: FM Demodulator (s(t) -> Differentiator v1(t) -> Envelope v2(t)) - Slide 12
  const l4DemodCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const rowH = height / 3;
      const samples = 500;

      const tracks = [
        {
          title: '1. Input FM Signal: s(t) = Ac·sin(2πf_ct + 2πk_f∫m(τ)dτ) [Constant Amplitude]',
          color: '#22d3ee'
        },
        {
          title: '2. Differentiator Output: v₁(t) = ds(t)/dt = 2πf_cAc[1 + (k_f/f_c)m(t)]cos(...) [FM converted to AM!]',
          color: '#f59e0b'
        },
        {
          title: '3. Envelope Detector Output: v₂(t) = 2πf_cAc(1 + (k_f/f_c)m(t)) [Recovered Message!]',
          color: '#10b981'
        }
      ];

      tracks.forEach((tr, idx) => {
        const yMid = rowH * idx + rowH * 0.56;
        ctx.strokeStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, yMid);
        ctx.lineTo(width, yMid);
        ctx.stroke();

        ctx.fillStyle = tr.color;
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(tr.title, 10, rowH * idx + 16);
      });

      for (let tr = 0; tr < 3; tr++) {
        const yMid = rowH * tr + rowH * 0.56;
        const amp = rowH * 0.34;
        ctx.beginPath();
        ctx.strokeStyle = tracks[tr].color;
        ctx.lineWidth = tr === 2 ? 2.6 : 1.9;

        for (let i = 0; i < samples; i++) {
          const t = (i / samples) * 4 * Math.PI;
          const m = Math.cos(t);
          const intM = Math.sin(t);
          const x = (i / samples) * width;
          let val = 0;

          if (tr === 0) {
            val = Math.sin(12 * t + 4.5 * fmDevDemo * intM);
          } else if (tr === 1) {
            val =
              (1 + 0.55 * fmDevDemo * m) *
              Math.cos(12 * t + 4.5 * fmDevDemo * intM);
          } else {
            val = 0.55 * fmDevDemo * m;
          }

          const y = yMid - val * amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
    [subTab, fmDevDemo]
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-cyan-400 font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Lecture 4: Angle Modulation — Modulators & Demodulators
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Simulate the Armstrong Indirect Wideband FM Modulator (Haykin Problem 2.37) and the Differentiator + Envelope Detector FM Demodulator.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700 shrink-0">
          <button
            onClick={() => setSubTab('armstrong')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'armstrong' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            4A. Indirect FM Modulator (Prob 2.37)
          </button>
          <button
            onClick={() => setSubTab('demod')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'demod' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            4B. Differentiator FM Demodulator
          </button>
        </div>
      </div>

      {/* SUB-TAB 4A: INDIRECT FM MODULATOR (ARMSTRONG) */}
      {subTab === 'armstrong' && (
        <div className="space-y-5">
          {/* Interactive Block Diagram from Lecture 4 Slide 6 & 7 */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-5">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Indirect Wideband FM Transmitter Chain (Lecture 4 Slides 6–7: Haykin Problem 2.37)
              </span>
              <button
                onClick={() => {
                  setN1(75);
                  setN2(50);
                  setFLoMhz(9.5);
                }}
                className="px-3 py-1 rounded bg-emerald-600/30 border border-emerald-500 text-emerald-200 text-xs font-semibold cursor-pointer"
              >
                Reset to Haykin Problem 2.37 Solution (100 MHz, Δf = 75 kHz)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              {/* Point A */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-3.5">
                <div className="text-cyan-400 font-bold">Point A: NBFM Modulator</div>
                <div className="text-slate-400 mt-1">Crystal Oscillator + Integrator</div>
                <div className="mt-2 pt-2 border-t border-slate-700 font-mono space-y-1">
                  <div className="text-white">f_c1 = {fc1Mhz.toFixed(2)} MHz</div>
                  <div className="text-amber-300">Δf_1 = {df1Hz} Hz (β = 0.2)</div>
                </div>
              </div>

              {/* Point B */}
              <div className="bg-slate-800 border border-cyan-500/50 rounded-xl p-3.5">
                <div className="text-cyan-300 font-bold">Point B: Freq Multiplier ×n₁ (×{n1})</div>
                <div className="text-slate-400 mt-1">Multiplies BOTH f_c and Δf by n₁</div>
                <div className="mt-2 pt-2 border-t border-slate-700 font-mono space-y-1">
                  <div className="text-white">f_c2 = {fcBMhz.toFixed(2)} MHz</div>
                  <div className="text-amber-300">Δf_2 = {(dfBHz / 1000).toFixed(2)} kHz</div>
                </div>
              </div>

              {/* Point C */}
              <div className="bg-slate-800 border border-amber-500/50 rounded-xl p-3.5">
                <div className="text-amber-300 font-bold">
                  Point C: Mixer (f_LO = {fLoMhz.toFixed(1)} MHz)
                </div>
                <div className="text-slate-400 mt-1">Shifts f_c ONLY; Δf is unchanged!</div>
                <div className="mt-2 pt-2 border-t border-slate-700 font-mono space-y-1">
                  <div className="text-white">f_c3 = |f_LO - f_c2| = {fcCMhz.toFixed(2)} MHz</div>
                  <div className="text-amber-300">Δf_3 = {(dfCHz / 1000).toFixed(2)} kHz</div>
                </div>
              </div>

              {/* Point D */}
              <div
                className={`rounded-xl p-3.5 border ${
                  Math.abs(fcDMhz - 100) < 0.5 && Math.abs(dfDKhz - 75) < 0.5
                    ? 'bg-emerald-950/60 border-emerald-500'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="text-emerald-300 font-bold">
                  Point D: Final Multiplier ×n₂ (×{n2})
                </div>
                <div className="text-slate-400 mt-1">Wideband FM Output</div>
                <div className="mt-2 pt-2 border-t border-slate-700 font-mono space-y-1">
                  <div className="text-white font-bold">f_c,out = {fcDMhz.toFixed(1)} MHz</div>
                  <div className="text-emerald-300 font-bold">Δf_out = {dfDKhz.toFixed(1)} kHz</div>
                </div>
              </div>
            </div>

            {/* Sliders for n1, f_LO, n2 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 pt-4 border-t border-slate-800">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">1st Multiplier Ratio (n₁)</span>
                  <span className="text-cyan-400 font-mono">n₁ = {n1}</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="100"
                  step="5"
                  value={n1}
                  onChange={(e) => setN1(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Mixer Crystal Oscillator (f_LO)</span>
                  <span className="text-amber-400 font-mono">{fLoMhz.toFixed(1)} MHz</span>
                </div>
                <input
                  type="range"
                  min="8.0"
                  max="11.0"
                  step="0.5"
                  value={fLoMhz}
                  onChange={(e) => setFLoMhz(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">2nd Multiplier Ratio (n₂)</span>
                  <span className="text-emerald-400 font-mono">n₂ = {n2}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="5"
                  value={n2}
                  onChange={(e) => setN2(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4B: DIFFERENTIATOR + ENVELOPE DETECTOR FM DEMODULATOR */}
      {subTab === 'demod' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm">
              FM Differentiator + Envelope Demodulator (Slide 12)
            </h3>
            <p className="text-xs text-slate-300">
              How do we extract <code className="text-emerald-300">m(t)</code> when it is trapped inside the instantaneous frequency? Pass <code className="text-cyan-300">s(t)</code> through a <strong>Differentiator (<code className="font-mono">d/dt</code>)</strong>!
            </p>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 font-mono text-[11px] text-amber-300 leading-relaxed">
              v₁(t) = ds(t)/dt = 2πf_c·A_c·[1 + (k_f/f_c)·m(t)]·cos(θ(t))
            </div>
            <p className="text-xs text-slate-400">
              By the chain rule, differentiating pulls the instantaneous frequency <code className="text-amber-300">2πf_c + 2πk_f·m(t)</code> out into the <strong>amplitude envelope</strong>, turning the FM wave into an AM wave that a standard <strong>Envelope Detector</strong> can read!
            </p>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Frequency Sensitivity (k_f)</span>
                <span className="text-cyan-400 font-mono">{fmDevDemo.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1.5"
                step="0.1"
                value={fmDevDemo}
                onChange={(e) => setFmDevDemo(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <canvas ref={l4DemodCanvasRef} className="w-full h-72 block" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LECTURE 5 MODULE: NON-LINEARITY, PLL & SUPERHETERODYNE (WRAPPER)
// ============================================================================
function Lecture5Lab() {
  const [subTab, setSubTab] = useState('nonlinearity'); // 'nonlinearity' | 'pll' | 'superhet'

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 px-2">
          Lecture 5 Sub-Modules: Select Simulation
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setSubTab('nonlinearity')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'nonlinearity'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            5A. Channel Non-Linearity (AM vs FM)
          </button>
          <button
            onClick={() => setSubTab('pll')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'pll' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            5B. Phase Mismatch & PLL Sync
          </button>
          <button
            onClick={() => setSubTab('superhet')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'superhet'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            5C. Superheterodyne & Image Freq
          </button>
        </div>
      </div>

      {subTab === 'nonlinearity' && <NonLinearityLab />}
      {subTab === 'pll' && <PllLab />}
      {subTab === 'superhet' && <SuperheterodyneLab />}
    </div>
  );
}

// ============================================================================
// LECTURE 6 MODULE: DIGITAL PM (BPSK/QPSK), FMCW RADAR & ITU SPECTRUM
// ============================================================================
function Lecture6Lab() {
  const [subTab, setSubTab] = useState('digitalpm'); // 'digitalpm' | 'radar'

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400 px-2">
          Lecture 6 Sub-Modules: Real-World Analog & Digital Systems
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setSubTab('digitalpm')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'digitalpm'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            6A. Digital PM (BPSK vs. QPSK)
          </button>
          <button
            onClick={() => setSubTab('radar')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              subTab === 'radar' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            6B. FMCW Radar & ITU 12-Band Spectrum
          </button>
        </div>
      </div>

      {subTab === 'digitalpm' && <DigitalPmLab />}
      {subTab === 'radar' && <RadarAndSpectrumLab />}
    </div>
  );
}

// ============================================================================
// TAB 1: CHANNEL NON-LINEARITY (AM vs. FM) - Lecture 5, Slides 3-5
// ============================================================================
function NonLinearityLab() {
  const [mode, setMode] = useState('AM'); // 'AM' or 'FM'
  const [a1, setA1] = useState(1.0);
  const [a2, setA2] = useState(0.4);
  const [a3, setA3] = useState(0.6);
  const [fc, setFc] = useState(120); // Carrier freq in kHz
  const [deltaF, setDeltaF] = useState(25); // Frequency deviation in kHz (for FM)
  const W = 10; // Baseband message bandwidth = 10 kHz

  // Check FM spectral overlap condition: 3*Delta_f + 2*W < f_c
  const minRequiredFc = 3 * deltaF + 2 * W;
  const hasFmOverlap = mode === 'FM' && fc <= minRequiredFc;

  // 1) Time-Domain Modulated Waveforms Canvas
  const timeCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const samples = 500;
      const midY = height / 2;
      const scaleY = height * 0.22;

      // Draw ideal input v_i(t) (dashed cyan)
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
      ctx.lineWidth = 1.5;

      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 2 * Math.PI;
        const m = Math.sin(t) + 0.3 * Math.cos(2 * t); // Baseband message m(t)
        let vi = 0;
        if (mode === 'AM') {
          vi = (1 + 0.55 * m) * Math.cos(18 * t);
        } else {
          const intM = -Math.cos(t) + 0.15 * Math.sin(2 * t);
          const beta = deltaF / 12;
          vi = Math.cos((fc / 8) * t + beta * intM * 2.5);
        }
        const x = (i / samples) * width;
        const y = midY - vi * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw non-linear channel output v_o(t) = a1*vi + a2*vi^2 + a3*vi^3
      ctx.beginPath();
      ctx.strokeStyle = mode === 'AM' ? '#f43f5e' : '#10b981';
      ctx.lineWidth = 2;

      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 2 * Math.PI;
        const m = Math.sin(t) + 0.3 * Math.cos(2 * t);
        let vi = 0;
        if (mode === 'AM') {
          vi = (1 + 0.55 * m) * Math.cos(18 * t);
        } else {
          const intM = -Math.cos(t) + 0.15 * Math.sin(2 * t);
          const beta = deltaF / 12;
          vi = Math.cos((fc / 8) * t + beta * intM * 2.5);
        }
        const vo = a1 * vi + a2 * Math.pow(vi, 2) + a3 * Math.pow(vi, 3);
        // Normalize visual height slightly so extreme a3 doesn't clip off screen
        const normVo = vo / (1 + 0.5 * a3);
        const x = (i / samples) * width;
        const y = midY - normVo * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },
    [mode, a1, a2, a3, fc, deltaF]
  );

  // 2) Frequency Spectrum S(f) Canvas
  const spectrumCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const baseLine = height - 28;
      const maxFreq = 420; // kHz axis max
      const fToX = (f) => 35 + ((f / maxFreq) * (width - 55));

      // Axis
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(25, baseLine);
      ctx.lineTo(width - 15, baseLine);
      ctx.stroke();

      // Helper to draw spectral lobe (triangle/trapezoid)
      const drawBand = (centerF, halfBW, amp, color, label, subLabel) => {
        const xCenter = fToX(centerF);
        const xLeft = Math.max(35, fToX(centerF - halfBW));
        const xRight = Math.min(width - 15, fToX(centerF + halfBW));
        const peakY = baseLine - Math.min(amp * (height - 58), height - 52);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(xLeft, baseLine);
        ctx.lineTo(xCenter - (xCenter - xLeft) * 0.3, peakY);
        ctx.lineTo(xCenter + (xRight - xCenter) * 0.3, peakY);
        ctx.lineTo(xRight, baseLine);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = color.replace('0.35', '0.95').replace('0.25', '0.9');
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, xCenter, Math.max(14, peakY - 14));
        if (subLabel) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px Inter, sans-serif';
          ctx.fillText(subLabel, xCenter, Math.max(25, peakY - 3));
        }
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`${centerF}k`, xCenter, baseLine + 15);
      };

      const bw1 = mode === 'FM' ? deltaF + W : W;
      const bw2 = mode === 'FM' ? 2 * deltaF + W : W;
      const bw3 = mode === 'FM' ? 3 * deltaF + W : W;

      // DC / Baseband term at 0 Hz (from a2 * vi^2)
      if (a2 > 0.01) {
        drawBand(0, W, 0.35 * a2, 'rgba(251, 191, 36, 0.35)', 'DC / Baseband', '0.5·a₂·Ac²');
      }

      // 2nd Harmonic at 2*fc (from a2 * vi^2)
      if (a2 > 0.01) {
        drawBand(
          2 * fc,
          bw2,
          0.45 * a2,
          hasFmOverlap ? 'rgba(244, 63, 94, 0.45)' : 'rgba(251, 191, 36, 0.35)',
          '2f_c Harmonic',
          `±${bw2} kHz`
        );
      }

      // 3rd Harmonic at 3*fc (from a3 * vi^3)
      if (a3 > 0.01 && 3 * fc < maxFreq) {
        drawBand(3 * fc, bw3, 0.32 * a3, 'rgba(168, 85, 247, 0.35)', '3f_c Harmonic', `±${bw3} kHz`);
      }

      // Desired Band at f_c
      const desiredAmp = Math.min(0.95, 0.55 * a1 + 0.35 * a3);
      drawBand(
        fc,
        bw1,
        desiredAmp,
        mode === 'AM' ? 'rgba(244, 63, 94, 0.35)' : 'rgba(16, 185, 129, 0.35)',
        'Desired @ f_c',
        mode === 'AM' ? 'm(t) + m³(t) mixed!' : `±${bw1} kHz`
      );

      // Draw Receiver Band-Pass Filter (BPF @ f_c) box
      const bpfLeft = fToX(fc - bw1 - 4);
      const bpfRight = fToX(fc + bw1 + 4);
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bpfLeft, 18, bpfRight - bpfLeft, baseLine - 18);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Rx BPF (@ f_c)', (bpfLeft + bpfRight) / 2, 13);
      ctx.restore();
    },
    [mode, a1, a2, a3, fc, deltaF, hasFmOverlap]
  );

  // 3) Recovered Baseband Message m(t) Canvas
  const messageCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const midY = height / 2;
      const scaleY = height * 0.28;
      const samples = 300;

      // Grid
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Original message m(t) (dashed cyan)
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 4 * Math.PI;
        const m = Math.sin(t) + 0.35 * Math.cos(2 * t);
        const x = (i / samples) * width;
        const y = midY - m * scaleY * 0.7;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Recovered message after BPF + Demodulator
      ctx.beginPath();
      ctx.strokeStyle = mode === 'AM' && a3 > 0.05 ? '#f43f5e' : hasFmOverlap ? '#f59e0b' : '#10b981';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 4 * Math.PI;
        const m = Math.sin(t) + 0.35 * Math.cos(2 * t);
        let recovered = m;

        if (mode === 'AM') {
          // Lecture 5 Slide 5: (a1*Ac*m(t) + 0.75*a3*Ac^3*m^3(t))
          recovered = (a1 * m + 0.75 * a3 * Math.pow(m, 3)) / Math.max(0.2, a1);
        } else {
          // Lecture 5 Slide 3-4: FM phase is untouched unless 2*fc overlaps fc
          if (hasFmOverlap && a2 > 0.02) {
            const overlapSeverity = ((minRequiredFc - fc) / minRequiredFc) * a2;
            recovered = m + overlapSeverity * 0.9 * Math.sin(7 * t);
          } else {
            recovered = m;
          }
        }

        const x = (i / samples) * width;
        const y = midY - Math.max(-1.6, Math.min(1.6, recovered)) * scaleY * 0.7;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },
    [mode, a1, a2, a3, fc, deltaF, hasFmOverlap, minRequiredFc]
  );

  return (
    <div className="space-y-6">
      {/* Top Explanation Banner */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            Lecture 5: Channel Amplitude Non-Linearities
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Real-world amplifiers are slightly non-linear:{' '}
            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">
              v_o(t) = a₁·v_i(t) + a₂·v_i²(t) + a₃·v_i³(t)
            </code>
            . Switch between <strong>AM</strong> and <strong>FM</strong> below to see why AM gets permanently distorted while FM stays clean!
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 shrink-0">
          <button
            onClick={() => setMode('AM')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              mode === 'AM'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AM Signal (Vulnerable)
          </button>
          <button
            onClick={() => setMode('FM')}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
              mode === 'FM'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            FM Signal (Immune)
          </button>
        </div>
      </div>

      {/* Controls & Live Formula Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Panel */}
        <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-5">
          <h3 className="text-white font-semibold flex items-center gap-2 text-base">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Channel & Signal Controls
          </h3>

          {/* a1 slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Linear Gain (a₁)</span>
              <span className="text-cyan-400 font-mono">{a1.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={a1}
              onChange={(e) => setA1(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* a2 slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Squared Non-Linearity (a₂ · v_i²)</span>
              <span className="text-amber-400 font-mono">{a2.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.0"
              step="0.05"
              value={a2}
              onChange={(e) => setA2(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              Creates DC (0 Hz) and 2nd Harmonic at <code className="text-amber-300">2f_c</code>.
            </p>
          </div>

          {/* a3 slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Cubic Non-Linearity (a₃ · v_i³)</span>
              <span className="text-rose-400 font-mono">{a3.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.2"
              step="0.05"
              value={a3}
              onChange={(e) => setA3(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              {mode === 'AM'
                ? 'Injects 0.75·a₃·Ac³·m³(t) right inside the f_c band!'
                : 'Only scales carrier amplitude at f_c; phase φ(t) stays untouched!'}
            </p>
          </div>

          <hr className="border-slate-700" />

          {/* Carrier Frequency fc */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Carrier Frequency (f_c)</span>
              <span className="text-emerald-400 font-mono">{fc} kHz</span>
            </div>
            <input
              type="range"
              min="60"
              max="160"
              step="5"
              value={fc}
              onChange={(e) => setFc(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* FM Deviation Delta f */}
          {mode === 'FM' && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">FM Freq. Deviation (Δf)</span>
                <span className="text-emerald-400 font-mono">{deltaF} kHz (W = 10 kHz)</span>
              </div>
              <input
                type="range"
                min="10"
                max="45"
                step="5"
                value={deltaF}
                onChange={(e) => setDeltaF(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          )}

          {/* Lecture 5 Spectral Overlap Check Box */}
          {mode === 'FM' ? (
            <div
              className={`p-3 rounded-lg border text-xs ${
                hasFmOverlap
                  ? 'bg-rose-950/60 border-rose-600 text-rose-200'
                  : 'bg-emerald-950/50 border-emerald-600/70 text-emerald-200'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 mb-1">
                {hasFmOverlap ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    Spectral Overlap! (3Δf + 2W ≥ f_c)
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    No Harmonic Overlap (3Δf + 2W &lt; f_c)
                  </>
                )}
              </div>
              <div>
                Required minimum <code className="font-mono">f_c &gt; 3({deltaF}) + 2(10) = {minRequiredFc} kHz</code>.
                Current <code className="font-mono">f_c = {fc} kHz</code>.
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border bg-rose-950/50 border-rose-700/70 text-xs text-rose-200">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                Why AM Cannot Be Filtered Clean:
              </div>
              At frequency <code className="font-mono">f_c</code>, the term is{' '}
              <code className="font-mono">(a₁Ac·m(t) + 0.75a₃Ac³·m³(t))cos(2πf_ct)</code>. Because{' '}
              <code className="font-mono">m³(t)</code> sits at the exact same carrier frequency{' '}
              <code className="font-mono">f_c</code>, no Band-Pass Filter can remove it!
            </div>
          )}
        </div>

        {/* 3 Visual Canvases */}
        <div className="lg:col-span-8 space-y-4">
          {/* Plot 1: Time Domain */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                1. Channel Waveform: Input v_i(t) vs. Non-Linear Output v_o(t)
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <span className="w-3 h-0.5 bg-cyan-400 inline-block border-b border-dashed" /> Input v_i(t)
                </span>
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span
                    className={`w-3 h-1 inline-block rounded ${
                      mode === 'AM' ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  />{' '}
                  Output v_o(t)
                </span>
              </div>
            </div>
            <div className="w-full">
              <canvas ref={timeCanvasRef} className="w-full h-36 block" />
            </div>
          </div>

          {/* Plot 2: Frequency Domain */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                2. Output Frequency Spectrum S(f) (0 Hz, f_c, 2f_c, 3f_c)
              </span>
              <span className="text-xs text-sky-400 font-mono">
                Dashed Box = Receiver Band-Pass Filter (@ f_c)
              </span>
            </div>
            <div className="w-full">
              <canvas ref={spectrumCanvasRef} className="w-full h-40 block" />
            </div>
          </div>

          {/* Plot 3: Recovered Baseband Message */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                3. Final Demodulated Audio Message After BPF (@ f_c)
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-cyan-300">--- Original m(t)</span>
                <span
                  className={
                    mode === 'AM' && a3 > 0.05
                      ? 'text-rose-400 font-semibold'
                      : hasFmOverlap
                      ? 'text-amber-400 font-semibold'
                      : 'text-emerald-400 font-semibold'
                  }
                >
                  ─── Recovered Output
                </span>
              </div>
            </div>
            <div className="w-full">
              <canvas ref={messageCanvasRef} className="w-full h-36 block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 2: PHASE MISMATCH & PHASE-LOCKED LOOP (PLL) - Lecture 5, Slides 6-10
// ============================================================================
function PllLab() {
  const [phiDeg, setPhiDeg] = useState(50); // Phase error in degrees (-180 to 180)
  const [pllActive, setPllActive] = useState(false);
  const [randomDrift, setRandomDrift] = useState(false);

  // Animate PLL auto-locking or random phase drift
  useEffect(() => {
    if (!pllActive && !randomDrift) return;

    const timer = setInterval(() => {
      setPhiDeg((prev) => {
        if (pllActive) {
          if (Math.abs(prev) < 0.8) {
            setPllActive(false);
            return 0;
          }
          // Smooth exponential convergence toward 0 deg
          return prev * 0.88;
        }
        if (randomDrift) {
          const next = prev + (Math.random() - 0.48) * 14;
          return Math.max(-180, Math.min(180, next));
        }
        return prev;
      });
    }, 60);

    return () => clearInterval(timer);
  }, [pllActive, randomDrift]);

  const phiRad = (phiDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phiRad);
  const absStrength = Math.round(Math.abs(cosPhi) * 100);

  // Lecture 5 Slide 8 & 9: Nominal Tx carrier = 5.00 Hz
  // If phi > 0 (Rx leads Tx), decrease Rx f_VCO (< 5 Hz, e.g. 4.81 Hz)
  // If phi < 0 (Rx lags Tx), increase Rx f_VCO (> 5 Hz, e.g. 5.19 Hz)
  const txFreq = 5.0;
  const vcoFreq =
    Math.abs(phiDeg) < 1
      ? 5.0
      : Number((5.0 - (phiDeg / 50) * 0.19).toFixed(2));

  // Canvas 1: Tx Carrier vs Rx Local Oscillator Wave
  const carrierCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const midY = height / 2;
      const amp = height * 0.34;
      const samples = 400;

      // Center axis
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Tx Carrier cos(2*pi*fc*t) (Cyan)
      ctx.beginPath();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 4 * Math.PI;
        const y = midY - Math.cos(2 * t) * amp;
        const x = (i / samples) * width;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Rx Local Carrier cos(2*pi*fc*t + phi) (Amber)
      ctx.beginPath();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 4 * Math.PI;
        const y = midY - Math.cos(2 * t + phiRad) * amp;
        const x = (i / samples) * width;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },
    [phiRad]
  );

  // Canvas 2: Demodulated Output v_o(t) = 0.5*Ac*Ac'*cos(phi)*m(t)
  const outputCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const midY = height / 2;
      const amp = height * 0.34;
      const samples = 400;

      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Ideal m(t) (dashed cyan)
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 2 * Math.PI;
        const m = Math.sin(t) + 0.4 * Math.sin(3 * t);
        const x = (i / samples) * width;
        const y = midY - m * amp * 0.7;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Actual Coherent Detector Output cos(phi)*m(t)
      ctx.beginPath();
      ctx.strokeStyle = Math.abs(cosPhi) < 0.2 ? '#f43f5e' : '#10b981';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < samples; i++) {
        const t = (i / samples) * 2 * Math.PI;
        const m = Math.sin(t) + 0.4 * Math.sin(3 * t);
        const vo = cosPhi * m;
        const x = (i / samples) * width;
        const y = midY - vo * amp * 0.7;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    },
    [cosPhi]
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm uppercase tracking-wider">
            <RefreshCw className="w-4 h-4" />
            Lecture 5: Coherent Receiver Phase Mismatch & Phase-Locked Loop (PLL)
          </div>
          <p className="text-slate-300 text-sm mt-1">
            A coherent receiver multiplies the incoming signal by a local oscillator{' '}
            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">
              c&apos;(t) = A&apos;_c cos(2πf_ct + φ)
            </code>
            , giving output{' '}
            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-emerald-300 font-mono">
              v_o(t) = 0.5·Ac·A&apos;_c·cos(φ)·m(t)
            </code>
            . If <code className="text-rose-400 font-mono">φ = ±90°</code>, the signal vanishes!
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => {
              setRandomDrift(false);
              setPllActive(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow transition cursor-pointer"
          >
            <Play className="w-4 h-4" />
            Engage PLL Auto-Lock (φ → 0°)
          </button>
          <button
            onClick={() => {
              setPllActive(false);
              setRandomDrift(!randomDrift);
            }}
            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition cursor-pointer ${
              randomDrift
                ? 'bg-rose-600 border-rose-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {randomDrift ? 'Stop Random φ(t) Drift' : 'Simulate Random Drift'}
          </button>
        </div>
      </div>

      {/* Controls & PLL Feedback Loop Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls */}
        <div className="lg:col-span-5 bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-base">Phase Error (φ) Controls</h3>
            <span className="font-mono text-lg font-bold text-amber-400">
              φ = {phiDeg.toFixed(0)}°
            </span>
          </div>

          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={phiDeg}
            onChange={(e) => {
              setPllActive(false);
              setRandomDrift(false);
              setPhiDeg(parseFloat(e.target.value));
            }}
            className="w-full accent-amber-400 cursor-pointer"
          />

          {/* Presets matching Lecture 5 Slides 7, 8, 9 */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                setPllActive(false);
                setRandomDrift(false);
                setPhiDeg(0);
              }}
              className="p-2 rounded bg-slate-900 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-medium cursor-pointer"
            >
              φ = 0° (Perfect Sync)
            </button>
            <button
              onClick={() => {
                setPllActive(false);
                setRandomDrift(false);
                setPhiDeg(90);
              }}
              className="p-2 rounded bg-slate-900 hover:bg-slate-700 text-rose-400 border border-slate-700 font-medium cursor-pointer"
            >
              φ = +90° (Total Null / 0V)
            </button>
            <button
              onClick={() => {
                setPllActive(false);
                setRandomDrift(false);
                setPhiDeg(50);
              }}
              className="p-2 rounded bg-slate-900 hover:bg-slate-700 text-amber-300 border border-slate-700 font-medium cursor-pointer"
            >
              φ = +50° (Rx Leads Tx)
            </button>
            <button
              onClick={() => {
                setPllActive(false);
                setRandomDrift(false);
                setPhiDeg(-50);
              }}
              className="p-2 rounded bg-slate-900 hover:bg-slate-700 text-sky-300 border border-slate-700 font-medium cursor-pointer"
            >
              φ = -50° (Rx Lags Tx)
            </button>
          </div>

          {/* Live PLL Correction Logic Card (Lecture 5 Slide 8-10) */}
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              How PLL Corrects This Phase Mismatch (Slide 8–10):
            </div>

            {Math.abs(phiDeg) < 1 ? (
              <div className="text-sm text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Locked (φ = 0°):</strong> Rx local oscillator is in exact phase with Tx carrier. VCO control voltage is 0V, so{' '}
                  <code className="font-mono">f_VCO = f_c = 5.00 Hz</code>.
                </div>
              </div>
            ) : phiDeg > 0 ? (
              <div className="text-sm text-amber-200 space-y-1">
                <div className="font-bold text-amber-400">
                  +ve Phase Mismatch (φ = +{phiDeg.toFixed(0)}° &gt; 0): Rx Leads Tx
                </div>
                <p className="text-xs text-slate-300">
                  The Rx local wave peaks <em>earlier</em> than the Tx wave. To let Tx catch up, the PLL increases VCO input voltage to temporarily{' '}
                  <strong>decrease Rx frequency</strong> (<code className="text-amber-300">f_VCO = {vcoFreq} Hz &lt; 5.00 Hz</code>) until φ drops to 0°!
                </p>
              </div>
            ) : (
              <div className="text-sm text-sky-200 space-y-1">
                <div className="font-bold text-sky-400">
                  -ve Phase Mismatch (φ = {phiDeg.toFixed(0)}° &lt; 0): Rx Lags Tx
                </div>
                <p className="text-xs text-slate-300">
                  The Rx local wave peaks <em>later</em> than the Tx wave. To catch up to Tx, the PLL decreases VCO input voltage to temporarily{' '}
                  <strong>increase Rx frequency</strong> (<code className="text-sky-300">f_VCO = {vcoFreq} Hz &gt; 5.00 Hz</code>) until φ rises to 0°!
                </p>
              </div>
            )}

            {/* Signal Strength Meter */}
            <div className="pt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Recovered Amplitude Scale: cos(φ) = {cosPhi.toFixed(2)}</span>
                <span className="font-bold text-white">{absStrength}% Strength</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    absStrength > 75
                      ? 'bg-emerald-500'
                      : absStrength > 25
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${absStrength}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Waveforms */}
        <div className="lg:col-span-7 space-y-4">
          {/* Plot 1: Tx vs Rx Carrier */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                1. Carrier Synchronization: Tx Carrier vs. Rx Local Oscillator
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-cyan-400 font-semibold">─── Tx Carrier (f_c = {txFreq.toFixed(2)} Hz)</span>
                <span className="text-amber-400 font-semibold">
                  ─── Rx Local Carrier (f_VCO = {vcoFreq.toFixed(2)} Hz)
                </span>
              </div>
            </div>
            <canvas ref={carrierCanvasRef} className="w-full h-40 block" />
          </div>

          {/* Plot 2: Demodulated Output */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                2. Coherent Detector Output: v_o(t) = 0.5·Ac·A&apos;_c·cos(φ)·m(t)
              </span>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-cyan-300">--- Original m(t)</span>
                <span className="text-emerald-400 font-semibold">
                  ─── Output ({cosPhi < 0 ? 'Inverted & ' : ''}{absStrength}% Amplitude)
                </span>
              </div>
            </div>
            <canvas ref={outputCanvasRef} className="w-full h-40 block" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 3: SUPERHETERODYNE RECEIVER & IMAGE PROBLEM - Lecture 5, Slides 15-17
// ============================================================================
function SuperheterodyneLab() {
  const [selectedStation, setSelectedStation] = useState(1); // 1 (1000 kHz) or 2 (1200 kHz)
  const [imageFilterOn, setImageFilterOn] = useState(true);

  // Constants matching Lecture 5 Slide 16-17 concepts
  const fIF = 450; // Fixed Intermediate Frequency = 450 kHz
  const fRF1 = 1000; // Channel 1 = 1000 kHz
  const fRF2 = 1200; // Channel 2 = 1200 kHz
  const fRF3 = 1900; // Channel 3 = 1900 kHz (Image of Channel 1 when fLO = 1450 kHz!)

  const targetRF = selectedStation === 1 ? fRF1 : fRF2;
  const fLO = targetRF + fIF; // High-side injection (as shown on Slide 16: f_LO > f_RF)
  const imageFreq = fLO + fIF; // Image sits at f_LO + f_IF

  // Does an active station sit at the image frequency?
  const hasImageStationCollision = selectedStation === 1 && !imageFilterOn;

  // Canvas 1: RF Spectrum before Mixer
  const rfCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const baseLine = height - 30;
      const minF = 700;
      const maxF = 2250;
      const fToX = (f) => 30 + (((f - minF) / (maxF - minF)) * (width - 50));

      // Axis
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, baseLine);
      ctx.lineTo(width - 15, baseLine);
      ctx.stroke();

      const drawChannel = (f, color, title, sub, attenuated = false) => {
        const x = fToX(f);
        const halfW = 24;
        const h = attenuated ? 18 : 75;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - halfW, baseLine);
        ctx.lineTo(x - halfW * 0.35, baseLine - h);
        ctx.lineTo(x + halfW * 0.35, baseLine - h);
        ctx.lineTo(x + halfW, baseLine);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = color.replace('0.35', '0.95');
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title, x, baseLine - h - 14);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(sub, x, baseLine - h - 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`${f} kHz`, x, baseLine + 16);
      };

      // Draw Channels 1, 2, 3
      drawChannel(fRF1, 'rgba(34, 211, 238, 0.35)', 'Ch 1 (f_RF1)', selectedStation === 1 ? 'Desired' : 'Other');
      drawChannel(fRF2, 'rgba(16, 185, 129, 0.35)', 'Ch 2 (f_RF2)', selectedStation === 2 ? 'Desired' : 'Other');
      drawChannel(
        fRF3,
        'rgba(244, 63, 94, 0.35)',
        'Ch 3 (f_RF3)',
        selectedStation === 1
          ? imageFilterOn
            ? 'Blocked Image!'
            : 'IMAGE INTERFERENCE!'
          : 'Other',
        imageFilterOn && selectedStation === 1
      );

      // Draw Local Oscillator impulse f_LO
      const xLO = fToX(fLO);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(xLO, baseLine);
      ctx.lineTo(xLO, baseLine - 92);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(`f_LO (${fLO} kHz)`, xLO, baseLine - 98);

      // Draw distance arrows <- f_IF -> around f_LO for Station 1
      if (selectedStation === 1) {
        const x1 = fToX(fRF1);
        const x3 = fToX(fRF3);
        const arrowY = baseLine - 48;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(x1, arrowY);
        ctx.lineTo(xLO, arrowY);
        ctx.moveTo(xLO, arrowY);
        ctx.lineTo(x3, arrowY);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText('← f_IF (450k) →', (x1 + xLO) / 2, arrowY - 5);
        ctx.fillText('← f_IF (450k) →', (xLO + x3) / 2, arrowY - 5);
        ctx.restore();
      }

      // Draw Image Rejection Filter curve if ON
      if (imageFilterOn) {
        const centerX = fToX(targetRF);
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        for (let px = 25; px < width - 20; px += 4) {
          const dist = (px - centerX) / 115;
          const resp = Math.exp(-Math.pow(dist, 4));
          const py = baseLine - resp * 95;
          if (px === 25) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText('RF Image Rejection Filter', centerX, 16);
        ctx.restore();
      }
    },
    [selectedStation, imageFilterOn, fLO, targetRF]
  );

  // Canvas 2: IF Spectrum after Mixer + Fixed Sharp Channel Filter @ f_IF
  const ifCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const baseLine = height - 30;
      const maxF = 900;
      const fToX = (f) => 35 + ((f / maxF) * (width - 60));

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(25, baseLine);
      ctx.lineTo(width - 15, baseLine);
      ctx.stroke();

      const drawIFBand = (f, color, label, heightPx = 75) => {
        const x = fToX(f);
        const halfW = 28;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - halfW, baseLine);
        ctx.lineTo(x - halfW * 0.35, baseLine - heightPx);
        ctx.lineTo(x + halfW * 0.35, baseLine - heightPx);
        ctx.lineTo(x + halfW, baseLine);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color.replace('0.4', '0.95');
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, baseLine - heightPx - 8);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`${f} kHz`, x, baseLine + 16);
      };

      if (selectedStation === 1) {
        // Ch 2 lands at |1200 - 1450| = 250 kHz (rejected by IF channel filter!)
        drawIFBand(250, 'rgba(16, 185, 129, 0.25)', 'Ch 2 (Rejected)', 45);
        // Ch 1 lands at |1000 - 1450| = 450 kHz = f_IF
        drawIFBand(450, 'rgba(34, 211, 238, 0.4)', 'Ch 1 @ f_IF', 78);

        // If Image Filter is OFF, Ch 3 (1900 kHz) ALSO lands at |1900 - 1450| = 450 kHz!
        if (!imageFilterOn) {
          drawIFBand(450, 'rgba(244, 63, 94, 0.55)', 'Ch 1 + Ch 3 COLLISION!', 92);
        }
      } else {
        // Tuned to Ch 2 (fLO = 1650 kHz):
        // Ch 3 lands at |1900 - 1650| = 250 kHz
        drawIFBand(250, 'rgba(244, 63, 94, 0.25)', 'Ch 3 (Rejected)', 45);
        // Ch 1 lands at |1000 - 1650| = 650 kHz
        drawIFBand(650, 'rgba(34, 211, 238, 0.25)', 'Ch 1 (Rejected)', 45);
        // Ch 2 lands at |1200 - 1650| = 450 kHz = f_IF
        drawIFBand(450, 'rgba(16, 185, 129, 0.4)', 'Ch 2 @ f_IF', 78);
      }

      // Draw Fixed Sharp IF Channel Filter @ 450 kHz
      const xIF = fToX(fIF);
      ctx.save();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(xIF - 34, 16, 68, baseLine - 16);
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Fixed Sharp IF Filter (450 kHz)', xIF, 12);
      ctx.restore();
    },
    [selectedStation, imageFilterOn]
  );

  return (
    <div className="space-y-6">
      {/* Top Explanation */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm uppercase tracking-wider">
            <Radio className="w-4 h-4" />
            Lecture 5: Superheterodyne Receiver & The Image Frequency Problem
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Instead of building a difficult tunable sharp filter, a Superheterodyne receiver shifts your chosen station{' '}
            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300 font-mono">f_RF</code> down to a fixed{' '}
            <strong>Intermediate Frequency</strong>{' '}
            <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">
              f_IF = |f_RF - f_LO| = 450 kHz
            </code>
            .
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setSelectedStation(1)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                selectedStation === 1 ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tune Ch 1 (1000 kHz)
            </button>
            <button
              onClick={() => setSelectedStation(2)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
                selectedStation === 2 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tune Ch 2 (1200 kHz)
            </button>
          </div>

          <button
            onClick={() => setImageFilterOn(!imageFilterOn)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
              imageFilterOn
                ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                : 'bg-rose-600 border-rose-500 text-white shadow-lg'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            RF Image Rejection Filter: {imageFilterOn ? 'ON' : 'OFF (See Collision!)'}
          </button>
        </div>
      </div>

      {/* Interactive Block Diagram (Lecture 5 Slide 16-17) */}
      <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Superheterodyne Signal Chain (Click Image Filter toggle above to test Slide 17):
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-center text-xs">
          <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="font-bold text-white">1. Antenna Input s_T(t)</div>
            <div className="text-slate-400 mt-1">Ch1 (1000k), Ch2 (1200k), Ch3 (1900k)</div>
          </div>

          <div
            className={`p-3 rounded-lg border transition ${
              imageFilterOn
                ? 'bg-sky-950/60 border-sky-500 text-sky-200'
                : 'bg-rose-950/50 border-rose-600/70 text-rose-300'
            }`}
          >
            <div className="font-bold">2. RF Amp + Image Filter</div>
            <div className="mt-1">
              {imageFilterOn
                ? `Blocks Image @ ${imageFreq} kHz`
                : 'Filter OFF: Image passes through!'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/70 text-amber-200">
            <div className="font-bold">3. Mixer (× f_LO)</div>
            <div className="font-mono mt-1">f_LO = {fLO} kHz</div>
            <div className="text-[11px] text-amber-300/80">Shifts |f_RF - f_LO| → 450 kHz</div>
          </div>

          <div className="p-3 rounded-lg bg-yellow-950/40 border border-yellow-500/70 text-yellow-200">
            <div className="font-bold">4. Fixed IF Amp + Filter</div>
            <div className="font-mono mt-1">f_IF = 450 kHz</div>
            <div className="text-[11px] text-yellow-300/80">Rejects neighboring channels</div>
          </div>

          <div
            className={`p-3 rounded-lg border ${
              hasImageStationCollision
                ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                : 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
            }`}
          >
            <div className="font-bold">5. Envelope Detector</div>
            <div className="mt-1">
              {hasImageStationCollision
                ? 'GARBLED! (Ch 1 + Ch 3 mixed)'
                : `Clean Audio: Channel ${selectedStation}`}
            </div>
          </div>
        </div>
      </div>

      {/* Two Spectrum Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              1. RF Spectrum S_T(f) Before Mixer
            </span>
            <span className="text-xs text-amber-400 font-mono">
              Image = f_LO + f_IF = {imageFreq} kHz
            </span>
          </div>
          <canvas ref={rfCanvasRef} className="w-full h-44 block" />
          <p className="text-xs text-slate-400 mt-2">
            Notice that <strong>Ch 1 (1000 kHz)</strong> is <code className="text-cyan-300">450 kHz below f_LO (1450 kHz)</code>, while{' '}
            <strong>Ch 3 (1900 kHz)</strong> is <code className="text-rose-400">450 kHz above f_LO</code>. Both are a distance of{' '}
            <code className="text-amber-300">f_IF</code> from <code className="text-amber-300">f_LO</code>!
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              2. Intermediate Frequency Spectrum S_IF(f) After Mixer
            </span>
            <span
              className={`text-xs font-bold ${
                hasImageStationCollision ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {hasImageStationCollision
                ? '⚠️ Image Interference at 450 kHz!'
                : '✓ Clean Single Channel at 450 kHz'}
            </span>
          </div>
          <canvas ref={ifCanvasRef} className="w-full h-44 block" />
          <p className="text-xs text-slate-400 mt-2">
            Once mixed to <code className="text-amber-300">f_IF = 450 kHz</code>, the fixed IF filter cannot tell Ch 1 and Ch 3 apart because they sit right on top of each other. That is why the <strong>Image Rejection Filter must be placed BEFORE the mixer</strong>!
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 4: DIGITAL PHASE MODULATION (BPSK vs. QPSK) - Lecture 6, Slide 13
// ============================================================================
function DigitalPmLab() {
  const [scheme, setScheme] = useState('QPSK'); // 'BPSK' or 'QPSK'
  const [bits, setBits] = useState([0, 0, 0, 1, 1, 1, 1, 0]);
  const [activeSymbolIdx, setActiveSymbolIdx] = useState(0);

  const toggleBit = (index) => {
    const updated = [...bits];
    updated[index] = updated[index] === 0 ? 1 : 0;
    setBits(updated);
  };

  // Group bits into symbols based on Lecture 6 Slide 13:
  // BPSK: 1 bit/symbol -> '1' = 0°, '0' = 180°
  // QPSK: 2 bits/symbol -> '00' = 45°, '01' = 135°, '11' = 225°, '10' = 315°
  const symbols = useMemo(() => {
    if (scheme === 'BPSK') {
      return bits.map((b, idx) => ({
        index: idx,
        label: `${b}`,
        deg: b === 1 ? 0 : 180,
        color: b === 1 ? '#22d3ee' : '#f43f5e'
      }));
    } else {
      const pairs = [];
      const mapDeg = {
        '00': { deg: 45, color: '#22d3ee' },
        '01': { deg: 135, color: '#10b981' },
        '11': { deg: 225, color: '#f59e0b' },
        '10': { deg: 315, color: '#a855f7' }
      };
      for (let i = 0; i < bits.length; i += 2) {
        const pairStr = `${bits[i]}${bits[i + 1]}`;
        pairs.push({
          index: i / 2,
          label: pairStr,
          deg: mapDeg[pairStr].deg,
          color: mapDeg[pairStr].color
        });
      }
      return pairs;
    }
  }, [scheme, bits]);

  // Constellation Diagram Canvas
  const constellationCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.34;

      // Axes (I and Q)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - radius - 25, cy);
      ctx.lineTo(cx + radius + 25, cy);
      ctx.moveTo(cx, cy - radius - 20);
      ctx.lineTo(cx, cy + radius + 20);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('I (In-Phase)', cx + radius - 20, cy - 8);
      ctx.fillText('Q (Quadrature)', cx + 8, cy - radius - 6);

      // Unit Circle
      ctx.strokeStyle = '#475569';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      const states =
        scheme === 'BPSK'
          ? [
              { label: '1 (0°)', deg: 0, color: '#22d3ee' },
              { label: '0 (180°)', deg: 180, color: '#f43f5e' }
            ]
          : [
              { label: '00 (45°)', deg: 45, color: '#22d3ee' },
              { label: '01 (135°)', deg: 135, color: '#10b981' },
              { label: '11 (225°)', deg: 225, color: '#f59e0b' },
              { label: '10 (315°)', deg: 315, color: '#a855f7' }
            ];

      const currentSym = symbols[activeSymbolIdx] || symbols[0];

      states.forEach((st) => {
        const rad = (st.deg * Math.PI) / 180;
        const px = cx + radius * Math.cos(rad);
        const py = cy - radius * Math.sin(rad);
        const isCurrent = currentSym && currentSym.deg === st.deg;

        if (isCurrent) {
          ctx.strokeStyle = st.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(px, py);
          ctx.stroke();
        }

        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.arc(px, py, isCurrent ? 10 : 7, 0, 2 * Math.PI);
        ctx.fill();

        if (isCurrent) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        ctx.fillStyle = '#f8fafc';
        ctx.font = isCurrent ? 'bold 12px Inter, sans-serif' : '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        const labelOffset = st.deg > 180 ? 22 : -14;
        ctx.fillText(st.label, px, py + labelOffset);
      });
    },
    [scheme, symbols, activeSymbolIdx]
  );

  // Modulated Carrier Waveform Canvas (Time Domain)
  const waveCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const midY = height / 2 + 8;
      const amp = height * 0.32;

      // Always show 8 symbol slots across width so user clearly sees QPSK finishes in HALF the time!
      const totalSlots = 8;
      const slotWidth = (width - 20) / totalSlots;

      symbols.forEach((sym, sIdx) => {
        const xStart = 10 + sIdx * slotWidth;
        const xEnd = xStart + slotWidth;

        // Highlight active symbol slot
        if (sIdx === activeSymbolIdx) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
          ctx.fillRect(xStart, 8, slotWidth, height - 16);
        }

        // Slot divider
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xStart, 10);
        ctx.lineTo(xStart, height - 10);
        ctx.stroke();

        // Top label: Bits + Phase
        ctx.fillStyle = sym.color;
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`"${sym.label}" (${sym.deg}°)`, xStart + slotWidth / 2, 22);

        // Draw carrier wave for this symbol
        const phaseRad = (sym.deg * Math.PI) / 180;
        ctx.beginPath();
        ctx.strokeStyle = sym.color;
        ctx.lineWidth = 2.2;
        const pts = 60;
        for (let i = 0; i <= pts; i++) {
          const localT = (i / pts) * 2 * Math.PI; // 1 full cycle per symbol slot
          const x = xStart + (i / pts) * slotWidth;
          const y = midY - Math.sin(localT + phaseRad) * amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // If QPSK, show the remaining 4 slots as "Free / 2x Faster Data Rate!"
      if (scheme === 'QPSK') {
        const xFreeStart = 10 + 4 * slotWidth;
        const freeWidth = 4 * slotWidth;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
        ctx.fillRect(xFreeStart, 10, freeWidth, height - 20);
        ctx.strokeStyle = '#10b981';
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(xFreeStart, 10, freeWidth, height - 20);
        ctx.setLineDash([]);

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          '✓ All 8 Bits Sent in Half the Time! (2× Data Rate of BPSK)',
          xFreeStart + freeWidth / 2,
          midY
        );
      }
    },
    [scheme, symbols, activeSymbolIdx]
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            Lecture 6: Digital Phase Modulation (BPSK vs. QPSK)
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Modern wireless systems (Wi-Fi, 4G/5G, satellites) encode digital bits into discrete carrier phase shifts. Click any of the 8 bits below to flip them and compare <strong>BPSK (1 bit/symbol)</strong> vs. <strong>QPSK (2 bits/symbol)</strong>!
          </p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 shrink-0">
          <button
            onClick={() => {
              setScheme('BPSK');
              setActiveSymbolIdx(0);
            }}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition cursor-pointer ${
              scheme === 'BPSK' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            BPSK (1 Bit / Symbol)
          </button>
          <button
            onClick={() => {
              setScheme('QPSK');
              setActiveSymbolIdx(0);
            }}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition cursor-pointer ${
              scheme === 'QPSK' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            QPSK (2 Bits / Symbol)
          </button>
        </div>
      </div>

      {/* Interactive 8-Bit Editor */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Click Bits to Toggle (8-Bit Stream):
          </span>
          <div className="flex gap-2">
            {bits.map((b, idx) => (
              <button
                key={idx}
                onClick={() => toggleBit(idx)}
                className={`w-10 h-10 rounded-lg font-mono font-bold text-base border transition cursor-pointer ${
                  b === 1
                    ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-slate-600 text-slate-300'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-300 bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-700">
          {scheme === 'BPSK' ? (
            <span>
              <strong>BPSK:</strong> 2 Phases (<code className="text-cyan-300">0°</code>,{' '}
              <code className="text-rose-400">180°</code>) → Needs <strong>8 symbols</strong> to send 8 bits.
            </span>
          ) : (
            <span>
              <strong>QPSK:</strong> 4 Phases (<code className="text-cyan-300">45°</code>,{' '}
              <code className="text-emerald-300">135°</code>, <code className="text-amber-300">225°</code>,{' '}
              <code className="text-purple-300">315°</code>) → Needs only <strong>4 symbols</strong> (2× faster)!
            </span>
          )}
        </div>
      </div>

      {/* Constellation + Waveform Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              I/Q Constellation Diagram
            </span>
            <span className="text-xs text-cyan-400 font-mono">
              Symbol #{activeSymbolIdx + 1}
            </span>
          </div>
          <canvas ref={constellationCanvasRef} className="w-full h-56 block" />
          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            {symbols.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSymbolIdx(idx)}
                className={`px-2.5 py-1 rounded text-xs font-mono border transition cursor-pointer ${
                  idx === activeSymbolIdx
                    ? 'bg-sky-600 border-sky-400 text-white font-bold'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Sym {idx + 1}: {s.label} ({s.deg}°)
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Transmitted Phase-Modulated Carrier Waveform s(t)
            </span>
            <span className="text-xs text-slate-400">
              Notice the instantaneous phase jumps at symbol boundaries
            </span>
          </div>
          <canvas ref={waveCanvasRef} className="w-full h-56 block" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300">
              <strong className="text-cyan-400">BPSK Key Takeaway (Slide 13):</strong> 1 symbol = 1 bit. Uses 2 phases separated by 180°. Very rugged against noise, but lower data rate.
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300">
              <strong className="text-purple-400">QPSK Key Takeaway (Slide 13):</strong> 1 symbol = 2 bits. Uses 4 phases (45°, 135°, 225°, 315°). Doubles the data rate in the same bandwidth!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB 5: FMCW RADAR & ITU RADIO SPECTRUM EXPLORER - Lecture 6, Slides 8-17
// ============================================================================
const ITU_BANDS = [
  { abbr: 'ELF', name: 'Extremely Low Frequency', range: '3 – 30 Hz', wavelength: '100,000 – 10,000 km', uses: 'Submarine communication', mod: 'FSK /MSK' },
  { abbr: 'SLF', name: 'Super Low Frequency', range: '30 – 300 Hz', wavelength: '10,000 – 1,000 km', uses: 'Deep-water submarine links', mod: 'FSK' },
  { abbr: 'ULF', name: 'Ultra Low Frequency', range: '300 – 3,000 Hz', wavelength: '1,000 – 100 km', uses: 'Underground mine communications, landlines', mod: 'Baseband / Voice' },
  { abbr: 'VLF', name: 'Very Low Frequency', range: '3 – 30 kHz', wavelength: '100 – 10 km', uses: 'Submarine links, time signals, navigation', mod: 'CW / MSK' },
  { abbr: 'LF', name: 'Low Frequency', range: '30 – 300 kHz', wavelength: '10 – 1 km', uses: 'Longwave AM broadcasting, RFID tags', mod: 'AM / Load Modulation' },
  { abbr: 'MF', name: 'Medium Frequency', range: '300 – 3,000 kHz', wavelength: '1,000 – 100 m', uses: 'Commercial AM radio broadcasts', mod: 'Full AM' },
  { abbr: 'HF', name: 'High Frequency', range: '3 – 30 MHz', wavelength: '100 – 10 m', uses: 'Shortwave radio, international aviation, ham radio', mod: 'AM / SSB' },
  { abbr: 'VHF', name: 'Very High Frequency', range: '30 – 300 MHz', wavelength: '10 – 1 m', uses: 'FM radio (88-108 MHz), aviation AM, maritime, walkie-talkies', mod: 'FM / NBFM / Aviation AM' },
  { abbr: 'UHF', name: 'Ultra High Frequency', range: '300 – 3,000 MHz (3 GHz)', wavelength: '1 m – 10 cm', uses: 'Cellular networks (4G/5G), Wi-Fi, GPS, digital TV', mod: 'QPSK / QAM / OFDM' },
  { abbr: 'SHF', name: 'Super High Frequency', range: '3 – 30 GHz', wavelength: '10 cm – 1 cm', uses: 'Satellite communications (Starlink), radar, 5 GHz Wi-Fi', mod: 'PSK / QAM / FMCW' },
  { abbr: 'EHF', name: 'Extremely High Frequency', range: '30 – 300 GHz', wavelength: '1 cm – 1 mm', uses: '5G millimeter-wave, automotive FMCW radar (77 GHz)', mod: 'FMCW / QPSK' },
  { abbr: 'THF', name: 'Terahertz / Tremendously High', range: '300 – 3,000 GHz (3 THz)', wavelength: '1 mm – 0.1 mm', uses: 'Experimental imaging and molecular spectroscopy', mod: 'Optical / FM Spectroscopy' }
];

const VHF_SUBBANDS = [
  { range: '88 – 108 MHz', title: 'FM Radio Broadcasting', scheme: 'Wideband FM (Δf = 75 kHz)', note: 'High-fidelity music & voice; immune to amplitude noise' },
  { range: '118.0 – 136.975 MHz', title: 'Aviation (Air-to-Ground)', scheme: 'Amplitude Modulation (AM)', note: 'Uses AM so overlapping pilot transmissions can still be heard rather than muting each other!' },
  { range: '136 – 174 MHz', title: 'Commercial Two-Way Radios', scheme: 'Narrowband FM (NBFM)', note: 'Public safety, walkie-talkies, and dispatch links' },
  { range: '144 – 148 MHz', title: 'Amateur Radio (2-Meter Band)', scheme: 'FM / SSB / CW', note: 'Local ham radio repeaters and emergency communication' },
  { range: '156.0 – 162.025 MHz', title: 'Maritime Communications', scheme: 'Narrowband FM', note: 'Ship-to-ship and ship-to-shore safety channels' }
];

function RadarAndSpectrumLab() {
  const [targetDistance, setTargetDistance] = useState(75); // meters
  const [selectedBandIdx, setSelectedBandIdx] = useState(7); // Default VHF

  // FMCW Beat Frequency calculation (illustrative automotive radar):
  // Beat frequency f_b is directly proportional to propagation delay tau = 2*d/c
  const beatFreqKhz = Math.round(targetDistance * 2.4);

  // FMCW Chirp Canvas
  const radarCanvasRef = useCanvas(
    (ctx, width, height) => {
      ctx.clearRect(0, 0, width, height);
      const baseLine = height - 26;
      const topY = 24;

      // Axes
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, topY - 10);
      ctx.lineTo(40, baseLine);
      ctx.lineTo(width - 15, baseLine);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Freq f(t)', 5, topY);
      ctx.fillText('Time (t) →', width - 65, baseLine + 16);

      const delayPx = (targetDistance / 180) * 85;
      const rampWidth = (width - 140) / 2;

      // Draw 2 sawtooth frequency chirps for Tx (Cyan) and Delayed Rx Echo (Amber)
      for (let cycle = 0; cycle < 2; cycle++) {
        const x0 = 48 + cycle * (rampWidth + 25);

        // Tx Chirp
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x0, baseLine - 8);
        ctx.lineTo(x0 + rampWidth, topY + 6);
        ctx.stroke();

        // Rx Delayed Echo Chirp
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x0 + delayPx, baseLine - 8);
        ctx.lineTo(x0 + delayPx + rampWidth, topY + 6);
        ctx.stroke();

        // Highlight instantaneous frequency difference (Beat Frequency Delta f) on first chirp
        if (cycle === 0) {
          const sampleX = x0 + delayPx + rampWidth * 0.45;
          const fracTx = (sampleX - x0) / rampWidth;
          const fracRx = (sampleX - (x0 + delayPx)) / rampWidth;
          const yTx = baseLine - 8 - fracTx * (baseLine - 8 - (topY + 6));
          const yRx = baseLine - 8 - fracRx * (baseLine - 8 - (topY + 6));

          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(sampleX, yTx);
          ctx.lineTo(sampleX, yRx);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#fda4af';
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillText(`Δf_beat = ${beatFreqKhz} kHz`, sampleX + 8, (yTx + yRx) / 2 + 4);
        }
      }
    },
    [targetDistance, beatFreqKhz]
  );

  const activeBand = ITU_BANDS[selectedBandIdx];

  return (
    <div className="space-y-6">
      {/* Section 1: Automotive FMCW Radar (Lecture 6 Slides 8-10) */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm uppercase tracking-wider">
              <Radar className="w-4 h-4" />
              Lecture 6: Automotive FMCW Radar (Waymo / Adaptive Cruise Control)
            </div>
            <p className="text-slate-300 text-sm mt-1">
              In <strong>Frequency-Modulated Continuous-Wave (FMCW)</strong> radar, the car sweeps its carrier frequency linearly upward. The time delay of the reflected echo creates a constant frequency gap (<code className="text-rose-300 font-mono">Δf_beat</code>) proportional to target distance!
            </p>
          </div>
          <div className="bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-700 shrink-0 text-right">
            <div className="text-xs text-slate-400">Measured Beat Frequency</div>
            <div className="text-xl font-bold font-mono text-rose-400">
              Δf = {beatFreqKhz} kHz → {targetDistance} m
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Target Vehicle Distance</span>
                <span className="text-cyan-400 font-mono font-bold">{targetDistance} meters</span>
              </div>
              <input
                type="range"
                min="15"
                max="150"
                step="5"
                value={targetDistance}
                onChange={(e) => setTargetDistance(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Visual Car Radar Range Bar */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 relative overflow-hidden">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="text-cyan-400 font-bold">🚗 Radar Sensor (Tx/Rx)</span>
                <span className="text-amber-400 font-bold">🚙 Target Vehicle ({targetDistance}m)</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full relative">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500/40 to-amber-500/70 rounded-full transition-all"
                  style={{ width: `${(targetDistance / 150) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Also used in contactless vital-sign monitoring (detecting tiny chest movements from breathing & heartbeats) and optical FMCW LiDAR.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-900/70 border border-slate-700 rounded-xl p-3">
            <div className="flex justify-between text-xs mb-1 px-2">
              <span className="text-cyan-400 font-semibold">─── Transmitted Frequency Sweep</span>
              <span className="text-amber-400 font-semibold">─── Delayed Echo from Target</span>
            </div>
            <canvas ref={radarCanvasRef} className="w-full h-36 block" />
          </div>
        </div>
      </div>

      {/* Section 2: Interactive ITU 12-Band Radio Spectrum Explorer (Lecture 6 Slides 16-17) */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            Lecture 6: Official ITU 12 Radio Frequency Bands & VHF Zoom (Slides 16–17)
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Click any of the 12 official ITU frequency bands below to inspect its frequency range, wavelength, and real-world communication systems.
          </p>
        </div>

        {/* 12 Interactive Band Pills */}
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
          {ITU_BANDS.map((band, idx) => (
            <button
              key={band.abbr}
              onClick={() => setSelectedBandIdx(idx)}
              className={`p-2.5 rounded-lg border text-center transition cursor-pointer ${
                idx === selectedBandIdx
                  ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg scale-105'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="font-bold text-sm">{band.abbr}</div>
              <div className="text-[10px] opacity-80 truncate">{band.range.split(' ')[0]}</div>
            </button>
          ))}
        </div>

        {/* Selected Band Detail Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-400">Band Name</div>
            <div className="text-base font-bold text-white mt-0.5">
              {activeBand.name} ({activeBand.abbr})
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Frequency & Wavelength</div>
            <div className="text-sm font-mono text-cyan-400 mt-0.5">{activeBand.range}</div>
            <div className="text-xs text-slate-400">λ = {activeBand.wavelength}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Typical Modulation</div>
            <div className="text-sm font-semibold text-amber-400 mt-0.5">{activeBand.mod}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Primary Real-World Uses (Slide 16)</div>
            <div className="text-sm text-emerald-300 mt-0.5">{activeBand.uses}</div>
          </div>
        </div>

        {/* Special VHF Band Sub-Allocations Breakdown (Lecture 6 Slide 17) */}
        <div className="pt-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">
            Closer Look: Very High Frequency (VHF: 30–300 MHz, λ = 10m to 1m) Sub-Bands (Slide 17)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {VHF_SUBBANDS.map((sub) => (
              <div
                key={sub.title}
                className="bg-slate-900/80 border border-slate-700/90 rounded-lg p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono text-cyan-400 font-bold">{sub.range}</div>
                  <div className="text-sm font-bold text-white mt-1">{sub.title}</div>
                  <div className="text-[11px] font-semibold text-amber-300 mt-0.5">{sub.scheme}</div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{sub.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APPLICATION SHELL: ALL 6 LECTURES
// ============================================================================
export default function App() {
  const [activeLecture, setActiveLecture] = useState('lec1');

  const lectures = [
    {
      id: 'lec1',
      code: 'Lecture 1',
      title: 'FT, Bandwidth & Octave',
      icon: Waves
    },
    {
      id: 'lec2',
      code: 'Lecture 2',
      title: 'Amplitude Modulation (AM/QAM)',
      icon: Activity
    },
    {
      id: 'lec3',
      code: 'Lecture 3',
      title: 'Angle Modulation (FM/PM/Bessel)',
      icon: Compass
    },
    {
      id: 'lec4',
      code: 'Lecture 4',
      title: 'FM Modulators & Demodulators',
      icon: GitBranch
    },
    {
      id: 'lec5',
      code: 'Lecture 5',
      title: 'Non-Linearity, PLL & Superhet',
      icon: Radio
    },
    {
      id: 'lec6',
      code: 'Lecture 6',
      title: 'Real-World, BPSK/QPSK & Radar',
      icon: Radar
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-20 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  ECE 351 / 252: Fundamentals of Communication Systems Interactive Lab
                </h1>
                <p className="text-xs text-slate-400">
                  Complete 6-Lecture Interactive Simulator — Faculty of Engineering, Ain Shams University
                </p>
              </div>
            </div>
          </div>

          {/* 6 Lecture Navigation Tabs */}
          <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {lectures.map((lec) => {
              const Icon = lec.icon;
              const isActive = activeLecture === lec.id;
              return (
                <button
                  key={lec.id}
                  onClick={() => setActiveLecture(lec.id)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-950/60'
                      : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-900 text-cyan-400'
                      }`}
                    >
                      {lec.code}
                    </span>
                    <Icon className="w-3.5 h-3.5 opacity-80" />
                  </div>
                  <div className="text-xs font-semibold mt-1.5 line-clamp-1">{lec.title}</div>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 pt-6">
        {activeLecture === 'lec1' && <Lecture1Lab />}
        {activeLecture === 'lec2' && <Lecture2Lab />}
        {activeLecture === 'lec3' && <Lecture3Lab />}
        {activeLecture === 'lec4' && <Lecture4Lab />}
        {activeLecture === 'lec5' && <Lecture5Lab />}
        {activeLecture === 'lec6' && <Lecture6Lab />}
      </main>
    </div>
  );
}