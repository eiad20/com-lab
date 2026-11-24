import React, { useMemo, useState } from 'react';
import {
  LineCodeType,
  encodeLineCode,
  generateLineCodePsd,
  simulateChannelAndEqualizer,
} from './digitalMath';
import { PlotCanvas, Series } from './PlotCanvas';

const LINE_CODE_INFO: Record<
  LineCodeType,
  { name: string; bw: string; dc: string; notes: string }
> = {
  'unipolar-nrz': {
    name: 'Unipolar NRZ',
    bw: 'R_b',
    dc: 'Non-zero + DC impulse',
    notes: 'Wastes DC power; poor noise immunity; no transparency on long 0s.',
  },
  'polar-nrz': {
    name: 'Polar NRZ',
    bw: 'R_b',
    dc: 'Non-zero at low freq',
    notes: 'Better power efficiency & noise immunity than unipolar; loses clock on long runs.',
  },
  'unipolar-rz': {
    name: 'Unipolar RZ',
    bw: '2 R_b',
    dc: 'Non-zero + discrete lines',
    notes: 'Double bandwidth; poor power efficiency; discrete spectral line aids clock recovery.',
  },
  'bipolar-rz': {
    name: 'Bipolar RZ (AMI)',
    bw: 'R_b',
    dc: 'Zero at DC (AC-coupled)',
    notes: 'Single-error detection via alternating-polarity rule violation; no excess BW.',
  },
  manchester: {
    name: 'Split-Phase (Manchester)',
    bw: '2 R_b',
    dc: 'Zero at DC',
    notes: 'Guaranteed mid-bit transition (self-clocking & transparent); used in Ethernet.',
  },
};

export const BasebandLineLab: React.FC = () => {
  const [subTab, setSubTab] = useState<'linecode' | 'equalizer'>('linecode');

  // Line coding controls
  const [bitStr, setBitStr] = useState('0110100110');
  const [lineCode, setLineCode] = useState<LineCodeType>('bipolar-rz');

  // Channel & Equalizer controls
  const [fcRatio, setFcRatio] = useState(0.45);
  const [noiseSigma, setNoiseSigma] = useState(0.05);
  const [enableCtle, setEnableCtle] = useState(true);
  const [ctleZero, setCtleZero] = useState(0.35);
  const [ctlePole, setCtlePole] = useState(1.6);
  const [enableDfe, setEnableDfe] = useState(false);
  const [dfeTap, setDfeTap] = useState(0.22);
  const [ffePost, setFfePost] = useState(0);

  const lineData = useMemo(() => {
    const bits = (bitStr.replace(/[^01]/g, '') || '01101001').split('').map(Number);
    const spb = 40;
    const y = encodeLineCode(bits, lineCode, spb, 1);
    const x = y.map((_, i) => i / spb);
    const psd = generateLineCodePsd(lineCode);
    return { x, y, psd, bits };
  }, [bitStr, lineCode]);

  const eqData = useMemo(
    () =>
      simulateChannelAndEqualizer({
        numBits: 44,
        spb: 28,
        channelFcRatio: fcRatio,
        noiseSigma,
        enableCtle,
        ctleZeroRatio: ctleZero,
        ctlePoleRatio: ctlePole,
        enableDfe,
        dfeTap,
        ffePre: 0,
        ffePost,
      }),
    [fcRatio, noiseSigma, enableCtle, ctleZero, ctlePole, enableDfe, dfeTap, ffePost]
  );

  const eyeX = useMemo(() => {
    const len = eqData.eyeRaw[0]?.length || 56;
    return Array.from({ length: len }, (_, i) => (i / (len - 1)) * 2);
  }, [eqData]);

  const makeEyeSeries = (traces: number[][], color: string): Series[] =>
    traces.slice(0, 26).map((tr) => ({
      x: eyeX,
      y: tr,
      color,
      lineWidth: 1.1,
    }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('linecode')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
            subTab === 'linecode'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Line Coding & PSD (Lec 8)
        </button>
        <button
          onClick={() => setSubTab('equalizer')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
            subTab === 'equalizer'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Channel ISI, Eye Diagram & CTLE/DFE (Lec 8 & 12)
        </button>
      </div>

      {subTab === 'linecode' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/70 p-4 rounded-lg border border-slate-800">
            <label className="text-xs text-slate-300">
              Binary Sequence
              <input
                type="text"
                value={bitStr}
                onChange={(e) => setBitStr(e.target.value.replace(/[^01]/g, '').slice(0, 24))}
                className="w-full mt-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded font-mono text-sky-300"
              />
            </label>
            <div className="text-xs text-slate-300">
              Line Code Format
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(Object.keys(LINE_CODE_INFO) as LineCodeType[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setLineCode(key)}
                    className={`px-2.5 py-1 rounded ${
                      lineCode === key ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {LINE_CODE_INFO[key].name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-3 rounded border border-slate-800 text-xs flex flex-wrap gap-6 text-slate-300">
            <div>
              <span className="text-slate-400">First-Null BW: </span>
              <span className="text-amber-400 font-mono">{LINE_CODE_INFO[lineCode].bw}</span>
            </div>
            <div>
              <span className="text-slate-400">DC Component: </span>
              <span className="text-emerald-400">{LINE_CODE_INFO[lineCode].dc}</span>
            </div>
            <div className="text-slate-400">{LINE_CODE_INFO[lineCode].notes}</div>
          </div>

          <PlotCanvas
            title={`${LINE_CODE_INFO[lineCode].name} Waveform`}
            xLabel="Bit Intervals (t / Tb)"
            yLabel="Voltage"
            series={[{ x: lineData.x, y: lineData.y, color: '#38bdf8', label: 'p(t)', step: true }]}
            yRange={[-1.3, 1.3]}
          />

          <PlotCanvas
            title="Normalized Power Spectral Density (PSD)"
            xLabel="Normalized Frequency (f / Rb)"
            yLabel="PSD"
            series={[{ x: lineData.psd.fNorm, y: lineData.psd.psd, color: '#f59e0b', label: 'S(f)' }]}
            impulses={lineData.psd.dcImpulse ? [{ x: 0, y: 1.0, color: '#f43f5e' }] : []}
            yRange={[0, 1.15]}
          />
        </div>
      )}

      {subTab === 'equalizer' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/70 p-4 rounded-lg border border-slate-800 text-xs text-slate-300">
            <div className="space-y-2">
              <div className="font-semibold text-slate-200">Wired Channel (Real LPF + AWGN)</div>
              <label className="block">
                Channel Cutoff f_c / R_b: <span className="text-sky-400 font-mono">{fcRatio.toFixed(2)}</span>
                <input
                  type="range"
                  min={0.18}
                  max={1.5}
                  step={0.05}
                  value={fcRatio}
                  onChange={(e) => setFcRatio(Number(e.target.value))}
                  className="w-full"
                />
              </label>
              <label className="block">
                Noise σ: <span className="text-sky-400 font-mono">{noiseSigma.toFixed(2)}</span>
                <input
                  type="range"
                  min={0}
                  max={0.25}
                  step={0.01}
                  value={noiseSigma}
                  onChange={(e) => setNoiseSigma(Number(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableCtle}
                  onChange={(e) => setEnableCtle(e.target.checked)}
                />
                Continuous-Time Equalizer (CTLE)
              </label>
              <label className="block">
                Zero f_z / R_b: <span className="text-emerald-400 font-mono">{ctleZero.toFixed(2)}</span>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={ctleZero}
                  onChange={(e) => setCtleZero(Number(e.target.value))}
                  className="w-full"
                />
              </label>
              <label className="block">
                Pole f_p / R_b: <span className="text-emerald-400 font-mono">{ctlePole.toFixed(2)}</span>
                <input
                  type="range"
                  min={0.5}
                  max={3.0}
                  step={0.1}
                  value={ctlePole}
                  onChange={(e) => setCtlePole(Number(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDfe}
                  onChange={(e) => setEnableDfe(e.target.checked)}
                />
                Discrete-Time DFE + FFE
              </label>
              <label className="block">
                DFE Post-Cursor Tap: <span className="text-purple-400 font-mono">{dfeTap.toFixed(2)}</span>
                <input
                  type="range"
                  min={0}
                  max={0.6}
                  step={0.02}
                  value={dfeTap}
                  onChange={(e) => setDfeTap(Number(e.target.value))}
                  className="w-full"
                />
              </label>
              <label className="block">
                FFE Post Tap (FIR): <span className="text-purple-400 font-mono">{ffePost.toFixed(2)}</span>
                <input
                  type="range"
                  min={-0.4}
                  max={0.2}
                  step={0.02}
                  value={ffePost}
                  onChange={(e) => setFfePost(Number(e.target.value))}
                  className="w-full"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlotCanvas
              title="Eye Diagram — Raw Channel Output (Before Equalization)"
              xLabel="Time (2 Tb)"
              series={makeEyeSeries(eqData.eyeRaw, 'rgba(244, 63, 94, 0.55)')}
              yRange={[-1.4, 1.4]}
            />
            <PlotCanvas
              title={`Eye Diagram — Equalized Output (Opening ≈ ${eqData.eyeOpening.toFixed(2)} V)`}
              xLabel="Time (2 Tb)"
              series={makeEyeSeries(eqData.eyeEq, 'rgba(56, 189, 248, 0.65)')}
              yRange={[-1.4, 1.4]}
            />
          </div>

          <PlotCanvas
            title="Channel vs. CTLE vs. Combined Frequency Response (dB)"
            xLabel="Normalized Frequency (f / Rb)"
            yLabel="Gain (dB)"
            series={[
              { x: eqData.freqAxis, y: eqData.chDb, color: '#f43f5e', label: 'Channel' },
              { x: eqData.freqAxis, y: eqData.ctleDb, color: '#22c55e', label: 'RX CTLE', dashed: true },
              { x: eqData.freqAxis, y: eqData.totalDb, color: '#38bdf8', label: 'Channel + CTLE' },
            ]}
            yRange={[-35, 20]}
          />
        </div>
      )}
    </div>
  );
};