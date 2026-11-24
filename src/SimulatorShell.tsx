import React, { useState } from 'react';
import AnalogApp from './App';
import { DigitalCommSuite } from './digital/DigitalCommSuite';

export const SimulatorShell: React.FC = () => {
  const [mode, setMode] = useState<'analog' | 'digital'>('digital');

  return (
    <div>
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-sm">
        <span className="font-semibold text-slate-200">Comm Lab Simulator</span>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('analog')}
            className={`px-3 py-1 rounded font-medium ${
              mode === 'analog'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Analog Comm (Lec 1–5)
          </button>
          <button
            onClick={() => setMode('digital')}
            className={`px-3 py-1 rounded font-medium ${
              mode === 'digital'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Digital Comm (Lec 6–12)
          </button>
        </div>
      </div>

      {mode === 'analog' ? <AnalogApp /> : <DigitalCommSuite />}
    </div>
  );
};