import React, { useMemo, useState } from 'react';
import {
  CompandingType,
  QuantType,
  generatePamData,
  generatePwmPpmData,
  generateQuantizationData,
  generateTdmData,
} from './digitalMath';
import { PlotCanvas } from './PlotCanvas';

type SubTab = 'pam' | 'pwm-ppm' | 'tdm' | 'pcm';

export const PulsePcmLab: React.FC = () => {
  const [tab, setTab] = useState<SubTab>('pam');

  // PAM / PWM / PPM state
  const [fm, setFm] = useState(2);
  const [fs, setFs] = useState(14);
  const [duty, setDuty] = useState(0.45);
  const [showEqualized, setShowEqualized] = useState(true);

  // TDM state
  const [tdmChannels, setTdmChannels] = useState(3);
  const [tdmFs, setTdmFs] = useState(8);

  // Quantization / PCM state
  const [bits, setBits] = useState(3);
  const [quantType, setQuantType] = useState<QuantType>('midtread');
  const [companding, setCompanding] = useState<CompandingType>('uniform');
  const [muVal, setMuVal] = useState(255);
  const [aVal, setAVal] = useState(87.6);
  const [inputScale, setInputScale] = useState(1.0);

  const pamData = useMemo(() => generatePamData(fm, fs, duty), [fm, fs, duty]);
  const pwmPpmData = useMemo(() => generatePwmPpmData(fm, fs), [fm, fs]);
  const tdmData = useMemo(() => generateTdmData(tdmChannels, tdmFs), [tdmChannels, tdmFs]);
  const qData = useMemo(
    () =>
      generateQuantizationData(
        bits,
        quantType,
        companding,
        companding === 'mu-law' ? muVal : aVal,
        inputScale
      ),
    [bits, quantType, companding, muVal, aVal, inputScale]
  );

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['pam', 'PAM & Equalizer (Lec 6)'],
            ['pwm-ppm', 'PWM & PPM (Lec 6)'],
            ['tdm', 'TDM Multiplexer (Lec 6)'],
            ['pcm', 'Quantization & Companding (Lec 7)'],
          ] as [SubTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              tab === id
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pam' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/70 p-4 rounded-lg border border-slate-800">
            <label className="text-xs text-slate-300">
              Message Base Freq fₘ: <span className="text-sky-400 font-mono">{fm} Hz</span>
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={fm}
                onChange={(e) => setFm(Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <label className="text-xs text-slate-300">
              Sampling Freq fₛ: <span className="text-sky-400 font-mono">{fs} Hz</span>
              <input
                type="range"
                min={6}
                max={30}
                step={1}
                value={fs}
                onChange={(e) => setFs(Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <label className="text-xs text-slate-300">
              Pulse Width T/Tₛ: <span className="text-sky-400 font-mono">{(duty * 100).toFixed(0)}%</span>
              <input
                type="range"
                min={0.1}
                max={0.95}
                step={0.05}
                value={duty}
                onChange={(e) => setDuty(Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer pt-3">
              <input
                type="checkbox"
                checked={showEqualized}
                onChange={(e) => setShowEqualized(e.target.checked)}
              />
              Show Rx Equalizer Hₑ(f) = 1 / [T·sinc(fT)]
            </label>
          </div>

          <PlotCanvas
            title="Flat-Top PAM Signal (Sample & Hold) — Time Domain"
            xLabel="Time (s)"
            yLabel="Amp"
            series={[
              { x: pamData.t, y: pamData.msg, color: '#64748b', label: 'm(t)', dashed: true },
              { x: pamData.t, y: pamData.pam, color: '#38bdf8', label: 'PAM s(t)', step: true },
            ]}
            yRange={[-1.25, 1.25]}
          />

          <PlotCanvas
            title="PAM Spectrum |S(f)| = |M_δ(f) · H(f)| & Aperture Effect"
            xLabel="Frequency (Hz)"
            yLabel="Mag"
            series={[
              { x: pamData.f, y: pamData.hMag, color: '#f59e0b', label: '|H(f)| sinc(fT)', dashed: true },
              { x: pamData.f, y: pamData.sMag, color: '#38bdf8', label: '|S(f)|' },
              ...(showEqualized
                ? [{ x: pamData.f, y: pamData.eqMag, color: '#22c55e', label: 'Equalized M(f)' }]
                : []),
            ]}
            yRange={[0, 1.2]}
          />
        </div>
      )}

      {tab === 'pwm-ppm' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/70 p-4 rounded-lg border border-slate-800">
            <label className="text-xs text-slate-300">
              Message Freq fₘ: <span className="text-sky-400 font-mono">{fm} Hz</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={fm}
                onChange={(e) => setFm(Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <label className="text-xs text-slate-300">
              Pulse Carrier Rate fₛ: <span className="text-sky-400 font-mono">{fs} Hz</span>
              <input
                type="range"
                min={6}
                max={24}
                step={1}
                value={fs}
                onChange={(e) => setFs(Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
          </div>

          <PlotCanvas
            title="Pulse Width Modulation (PWM) — Width ∝ Message Amplitude"
            xLabel="Time (s)"
            series={[
              { x: pwmPpmData.t, y: pwmPpmData.msg, color: '#94a3b8', label: 'm(t)', dashed: true },
              { x: pwmPpmData.t, y: pwmPpmData.pwm, color: '#a855f7', label: 'PWM', step: true },
            ]}
            yRange={[-1.2, 1.3]}
          />
          <PlotCanvas
            title="Pulse Position Modulation (PPM) — Shift ∝ Message Amplitude"
            xLabel="Time (s)"
            series={[
              { x: pwmPpmData.t, y: pwmPpmData.msg, color: '#94a3b8', label: 'm(t)', dashed: true },
              { x: pwmPpmData.t, y: pwmPpmData.ppm, color: '#10b981', label: 'PPM', step: true },
            ]}
            yRange={[-1.2, 1.3]}
          />
        </div>
      )}

      {tab === 'tdm' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/70 p-4 rounded-lg border border-slate-800 items-center">
            <label className="text-xs text-slate-300">
              Number of Channels (N): <span className="text-sky-400 font-mono">{tdmChannels}</span>
              <input
                type="range"
                min={2}
                max={4}
                step={1}
                value={tdmChannels}
                onChange={(e) => setTdmChannels(Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <label className="text-xs text-slate-300">
              Frame Sampling Rate fₛ: <span className="text-sky-400 font-mono">{tdmFs} Hz</span>
              <input
                type="range"
                min={4}
                max={16}
                step={1}
                value={tdmFs}
                onChange={(e) => setTdmFs(Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <div className="text-xs bg-slate-800/80 p-2.5 rounded border border-slate-700 font-mono text-slate-200">
              BW Expansion Factor: <span className="text-amber-400">{tdmChannels}×</span> (Slot = {(1000 / (tdmFs * tdmChannels)).toFixed(1)} ms)
            </div>
          </div>

          <PlotCanvas
            title="Input Analog Channels Before Commutator"
            xLabel="Time (s)"
            series={tdmData.chSignals.map((sig, idx) => ({
              x: tdmData.t,
              y: sig,
              color: ['#38bdf8', '#f472b6', '#4ade80', '#facc15'][idx],
              label: `Ch ${idx + 1}`,
            }))}
            yRange={[-1.25, 1.25]}
          />
          <PlotCanvas
            title="Interleaved TDM Composite Pulse Train (Commutator Output)"
            xLabel="Time (s)"
            series={[{ x: tdmData.t, y: tdmData.tdm, color: '#f59e0b', label: 'TDM Signal', step: true }]}
            yRange={[-1.25, 1.25]}
          />
        </div>
      )}

      {tab === 'pcm' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/70 p-4 rounded-lg border border-slate-800">
            <label className="text-xs text-slate-300">
              Bit Depth R: <span className="text-sky-400 font-mono">{bits} bits ({qData.L} levels)</span>
              <input
                type="range"
                min={2}
                max={6}
                step={1}
                value={bits}
                onChange={(e) => setBits(Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <label className="text-xs text-slate-300">
              Input Signal Level: <span className="text-sky-400 font-mono">{(inputScale * 100).toFixed(0)}%</span>
              <input
                type="range"
                min={0.15}
                max={1.0}
                step={0.05}
                value={inputScale}
                onChange={(e) => setInputScale(Number(e.target.value))}
                className="w-full mt-1"
              />
            </label>
            <div className="text-xs text-slate-300 space-y-1">
              <div>Quantizer Structure</div>
              <div className="flex gap-2">
                {(['midtread', 'midrise'] as QuantType[]).map((qt) => (
                  <button
                    key={qt}
                    onClick={() => setQuantType(qt)}
                    className={`px-2 py-1 rounded capitalize ${
                      quantType === qt ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {qt}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              <div>Companding Law</div>
              <div className="flex gap-1.5">
                {(['uniform', 'mu-law', 'a-law'] as CompandingType[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCompanding(c)}
                    className={`px-2 py-1 rounded ${
                      companding === c ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {c === 'mu-law' ? 'μ-law' : c === 'a-law' ? 'A-law' : 'Uniform'}
                  </button>
                ))}
              </div>
              {companding === 'mu-law' && (
                <input
                  type="range"
                  min={5}
                  max={255}
                  step={10}
                  value={muVal}
                  onChange={(e) => setMuVal(Number(e.target.value))}
                  className="w-full"
                />
              )}
              {companding === 'a-law' && (
                <input
                  type="range"
                  min={2}
                  max={100}
                  step={2}
                  value={aVal}
                  onChange={(e) => setAVal(Number(e.target.value))}
                  className="w-full"
                />
              )}
            </div>
          </div>

          {/* Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-900 p-3 rounded border border-slate-800">
              <div className="text-slate-400">Step Δ = 2mₚ / 2ᴿ</div>
              <div className="text-base text-sky-400">{qData.delta.toFixed(4)}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded border border-slate-800">
              <div className="text-slate-400">Noise Variance σ² = Δ²/12</div>
              <div className="text-base text-amber-400">{qData.variance.toExponential(2)}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded border border-slate-800">
              <div className="text-slate-400">Theory SQNR (1.8 + 6R)</div>
              <div className="text-base text-emerald-400">{qData.theoreticalSnrDb.toFixed(1)} dB</div>
            </div>
            <div className="bg-slate-900 p-3 rounded border border-slate-800">
              <div className="text-slate-400">Measured SQNR</div>
              <div className="text-base text-purple-400">{qData.measuredSnrDb.toFixed(1)} dB</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlotCanvas
              title="Input vs. Quantized Output Waveform"
              xLabel="Time (s)"
              series={[
                { x: qData.t, y: qData.input, color: '#64748b', label: 'm(t)', dashed: true },
                { x: qData.t, y: qData.quantized, color: '#38bdf8', label: 'v(t)', step: true },
              ]}
              yRange={[-1.2, 1.2]}
            />
            <PlotCanvas
              title="Quantization Error q(t) = m(t) - v(t)"
              xLabel="Time (s)"
              series={[{ x: qData.t, y: qData.error, color: '#f43f5e', label: 'q(t)' }]}
            />
          </div>

          <PlotCanvas
            title="Quantizer Transfer Characteristic & Compressor Curve"
            xLabel="Normalized Input m"
            yLabel="Output v"
            series={[
              { x: qData.curveIn, y: qData.compCurve, color: '#10b981', label: 'Compressor', dashed: true },
              { x: qData.curveIn, y: qData.curveOut, color: '#f59e0b', label: 'Quantizer Staircase' },
            ]}
            yRange={[-1.15, 1.15]}
          />
        </div>
      )}
    </div>
  );
};