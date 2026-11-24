import React, { useState } from 'react';
import { PulsePcmLab } from './PulsePcmLab';
import { BasebandLineLab } from './BasebandLineLab';
import { PassbandModLab } from './PassbandModLab';

type ModuleTab = 'pulse-pcm' | 'baseband' | 'passband';

export const DigitalCommSuite: React.FC = () => {
  const [module, setModule] = useState<ModuleTab>('pulse-pcm');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              Digital & Pulse Communications Lab (ECE 252)
            </h1>
            <p className="text-xs text-slate-400">
              Lectures 6–12: PAM/PWM/PPM/TDM · Quantization & Companding · Line Coding & Equalization · Passband Keying
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {(
              [
                ['pulse-pcm', '1. Pulse & PCM (Lec 6–7)'],
                ['baseband', '2. Baseband & Equalizers (Lec 8 & 12)'],
                ['passband', '3. Passband ASK/PSK/QAM/FSK (Lec 9–11)'],
              ] as [ModuleTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setModule(id)}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                  module === id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <main>
          {module === 'pulse-pcm' && <PulsePcmLab />}
          {module === 'baseband' && <BasebandLineLab />}
          {module === 'passband' && <PassbandModLab />}
        </main>
      </div>
    </div>
  );
};