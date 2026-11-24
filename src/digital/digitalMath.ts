export function sinc(x: number): number {
  if (Math.abs(x) < 1e-8) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

// Box-Muller standard normal RNG (deterministic seed option for stable plots)
export function createRng(seed = 42) {
  let s = seed >>> 0;
  const next = () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return () => {
    const u1 = Math.max(1e-7, next());
    const u2 = next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

// ==========================================
// LECTURE 6: PAM, PWM, PPM, TDM
// ==========================================
export function generatePamData(
  fm: number,
  fs: number,
  duty: number,
  duration = 1.0,
  numPts = 800
) {
  const Ts = 1 / fs;
  const T = Math.min(0.98, Math.max(0.05, duty)) * Ts;
  const t: number[] = [];
  const msg: number[] = [];
  const pam: number[] = [];

  for (let i = 0; i < numPts; i++) {
    const ti = (i / (numPts - 1)) * duration;
    t.push(ti);
    const m = Math.sin(2 * Math.PI * fm * ti) * 0.75 + 0.25 * Math.cos(2 * Math.PI * 2 * fm * ti);
    msg.push(m);

    const k = Math.floor(ti / Ts);
    const localT = ti - k * Ts;
    const sampleVal =
      Math.sin(2 * Math.PI * fm * (k * Ts)) * 0.75 +
      0.25 * Math.cos(2 * Math.PI * 2 * fm * (k * Ts));
    pam.push(localT < T ? sampleVal : 0);
  }

  // Frequency domain: |H(f)| = T * |sinc(fT)|, |S(f)| = |M_delta(f) * H(f)|
  const fMax = fs * 2.5;
  const freqPts = 400;
  const f: number[] = [];
  const hMag: number[] = [];
  const sMag: number[] = [];
  const eqMag: number[] = [];

  for (let i = 0; i < freqPts; i++) {
    const fi = -fMax + (2 * fMax * i) / (freqPts - 1);
    f.push(fi);
    const aperture = Math.abs(sinc(fi * T));
    hMag.push(aperture);

    // Sum of baseband replicas M(f - n*fs) modeled as triangular spectrum of BW W = 2*fm
    const W = 2 * fm;
    let mDelta = 0;
    for (let n = -3; n <= 3; n++) {
      const df = Math.abs(fi - n * fs);
      if (df < W) {
        mDelta += 1 - df / W;
      }
    }
    sMag.push(mDelta * aperture);
    // Receiver LPF (|f| <= W) + Equalizer He(f) = 1 / sinc(fT)
    eqMag.push(Math.abs(fi) <= W ? mDelta : 0);
  }

  return { t, msg, pam, f, hMag, sMag, eqMag, Ts, T };
}

export function generatePwmPpmData(fm: number, fs: number, duration = 1.0, numPts = 800) {
  const Ts = 1 / fs;
  const t: number[] = [];
  const msg: number[] = [];
  const pwm: number[] = [];
  const ppm: number[] = [];
  const ppmWidth = 0.14 * Ts;

  for (let i = 0; i < numPts; i++) {
    const ti = (i / (numPts - 1)) * duration;
    t.push(ti);
    const m = Math.sin(2 * Math.PI * fm * ti);
    msg.push(m);

    const k = Math.floor(ti / Ts);
    const localT = ti - k * Ts;
    const sampleVal = Math.sin(2 * Math.PI * fm * (k * Ts)); // [-1, 1]
    const norm = (sampleVal + 1) / 2; // [0, 1]

    const pulseWidth = (0.1 + 0.78 * norm) * Ts;
    pwm.push(localT < pulseWidth ? 1 : 0);

    const pulsePos = (0.08 + 0.72 * norm) * Ts;
    ppm.push(localT >= pulsePos && localT < pulsePos + ppmWidth ? 1 : 0);
  }

  return { t, msg, pwm, ppm };
}

export function generateTdmData(channels: number, fs: number, duration = 1.0, numPts = 800) {
  const Ts = 1 / fs;
  const slotDur = Ts / channels;
  const pulseDur = slotDur * 0.75;
  const freqs = [1, 2, 3, 1.5];
  const t: number[] = [];
  const chSignals: number[][] = Array.from({ length: channels }, () => []);
  const tdm: number[] = [];
  const tdmOwner: number[] = [];

  for (let i = 0; i < numPts; i++) {
    const ti = (i / (numPts - 1)) * duration;
    t.push(ti);
    for (let c = 0; c < channels; c++) {
      const val =
        c % 2 === 0
          ? Math.sin(2 * Math.PI * freqs[c] * ti + c * 0.7)
          : Math.cos(2 * Math.PI * freqs[c] * ti);
      chSignals[c].push(val);
    }

    const frameIdx = Math.floor(ti / Ts);
    const frameLocal = ti - frameIdx * Ts;
    const activeCh = Math.min(channels - 1, Math.floor(frameLocal / slotDur));
    const slotLocal = frameLocal - activeCh * slotDur;
    const sampleTime = frameIdx * Ts + activeCh * slotDur;
    const sampleVal =
      activeCh % 2 === 0
        ? Math.sin(2 * Math.PI * freqs[activeCh] * sampleTime + activeCh * 0.7)
        : Math.cos(2 * Math.PI * freqs[activeCh] * sampleTime);

    if (slotLocal < pulseDur) {
      tdm.push(sampleVal);
      tdmOwner.push(activeCh);
    } else {
      tdm.push(0);
      tdmOwner.push(-1);
    }
  }

  return { t, chSignals, tdm, tdmOwner };
}

// ==========================================
// LECTURE 7: QUANTIZATION & COMPANDING
// ==========================================
export type QuantType = 'midtread' | 'midrise';
export type CompandingType = 'uniform' | 'mu-law' | 'a-law';

export function compressSample(x: number, mp: number, mode: CompandingType, param: number): number {
  const u = Math.max(-1, Math.min(1, x / mp));
  const s = Math.sign(u);
  const absU = Math.abs(u);

  if (mode === 'mu-law') {
    const mu = Math.max(1e-4, param);
    return s * (Math.log(1 + mu * absU) / Math.log(1 + mu)) * mp;
  }
  if (mode === 'a-law') {
    const A = Math.max(1, param);
    const denom = 1 + Math.log(A);
    const out = absU < 1 / A ? (A * absU) / denom : (1 + Math.log(A * absU)) / denom;
    return s * out * mp;
  }
  return x;
}

export function expandSample(y: number, mp: number, mode: CompandingType, param: number): number {
  const w = Math.max(-1, Math.min(1, y / mp));
  const s = Math.sign(w);
  const absW = Math.abs(w);

  if (mode === 'mu-law') {
    const mu = Math.max(1e-4, param);
    return s * ((Math.pow(1 + mu, absW) - 1) / mu) * mp;
  }
  if (mode === 'a-law') {
    const A = Math.max(1, param);
    const denom = 1 + Math.log(A);
    const out = absW < 1 / denom ? (absW * denom) / A : Math.exp(absW * denom - 1) / A;
    return s * out * mp;
  }
  return y;
}

export function quantizeUniform(x: number, mp: number, bits: number, type: QuantType): number {
  const L = Math.pow(2, bits);
  const delta = (2 * mp) / L;
  if (type === 'midrise') {
    const idx = Math.max(0, Math.min(L - 1, Math.floor((x + mp) / delta)));
    return -mp + (idx + 0.5) * delta;
  }
  // midtread: zero is a reconstruction level
  const idx = Math.max(-L / 2, Math.min(L / 2 - 1, Math.round(x / delta)));
  return idx * delta;
}

export function generateQuantizationData(
  bits: number,
  quantType: QuantType,
  companding: CompandingType,
  compParam: number,
  inputScale = 1.0,
  numPts = 600
) {
  const mp = 1.0;
  const L = Math.pow(2, bits);
  const delta = (2 * mp) / L;

  const t: number[] = [];
  const input: number[] = [];
  const quantized: number[] = [];
  const error: number[] = [];

  let sigPow = 0;
  let errPow = 0;

  for (let i = 0; i < numPts; i++) {
    const ti = i / (numPts - 1);
    t.push(ti);
    const x = inputScale * mp * Math.sin(2 * Math.PI * 2 * ti);
    const c = compressSample(x, mp, companding, compParam);
    const q = quantizeUniform(c, mp, bits, quantType);
    const rec = expandSample(q, mp, companding, compParam);
    const err = x - rec;

    input.push(x);
    quantized.push(rec);
    error.push(err);
    sigPow += x * x;
    errPow += err * err;
  }

  const measuredSnrDb = 10 * Math.log10((sigPow + 1e-12) / (errPow + 1e-12));
  const theoreticalSnrDb = 1.8 + 6 * bits;
  const variance = (delta * delta) / 12;

  // Transfer curve (normalized input vs output)
  const curveIn: number[] = [];
  const curveOut: number[] = [];
  const compCurve: number[] = [];
  for (let i = 0; i <= 200; i++) {
    const x = -mp + (2 * mp * i) / 200;
    curveIn.push(x);
    const c = compressSample(x, mp, companding, compParam);
    compCurve.push(c);
    curveOut.push(expandSample(quantizeUniform(c, mp, bits, quantType), mp, companding, compParam));
  }

  return {
    t,
    input,
    quantized,
    error,
    curveIn,
    curveOut,
    compCurve,
    L,
    delta,
    variance,
    measuredSnrDb,
    theoreticalSnrDb,
  };
}

// ==========================================
// LECTURES 8 & 12: LINE CODING, CHANNEL, CTLE, FFE/DFE, EYE
// ==========================================
export type LineCodeType =
  | 'unipolar-nrz'
  | 'polar-nrz'
  | 'unipolar-rz'
  | 'bipolar-rz'
  | 'manchester';

export function encodeLineCode(bits: number[], type: LineCodeType, spb = 40, A = 1) {
  const waveform: number[] = [];
  let amiPolarity = 1;

  for (let bIdx = 0; bIdx < bits.length; bIdx++) {
    const bit = bits[bIdx];
    const half = Math.floor(spb / 2);

    if (type === 'bipolar-rz' && bit === 1) {
      for (let i = 0; i < spb; i++) {
        waveform.push(i < half ? amiPolarity * A : 0);
      }
      amiPolarity = -amiPolarity;
      continue;
    }

    for (let i = 0; i < spb; i++) {
      switch (type) {
        case 'unipolar-nrz':
          waveform.push(bit === 1 ? A : 0);
          break;
        case 'polar-nrz':
          waveform.push(bit === 1 ? A : -A);
          break;
        case 'unipolar-rz':
          waveform.push(bit === 1 && i < half ? A : 0);
          break;
        case 'bipolar-rz':
          waveform.push(0);
          break;
        case 'manchester':
          if (bit === 1) waveform.push(i < half ? A : -A);
          else waveform.push(i < half ? -A : A);
          break;
      }
    }
  }
  return waveform;
}

// Normalized analytical PSD vs normalized frequency u = f * Tb (Lecture 8 slides 15-19)
export function generateLineCodePsd(type: LineCodeType, numPts = 300) {
  const fNorm: number[] = [];
  const psd: number[] = [];
  const dcImpulse = type === 'unipolar-nrz' || type === 'unipolar-rz';

  for (let i = 0; i < numPts; i++) {
    const u = (i / (numPts - 1)) * 3.0; // 0 to 3*Rb
    fNorm.push(u);
    let val = 0;
    switch (type) {
      case 'unipolar-nrz':
        val = 0.5 * Math.pow(sinc(u), 2);
        break;
      case 'polar-nrz':
        val = Math.pow(sinc(u), 2);
        break;
      case 'unipolar-rz':
        val = 0.25 * Math.pow(sinc(u / 2), 2);
        break;
      case 'bipolar-rz':
        val = Math.pow(sinc(u / 2) * Math.sin(Math.PI * u), 2);
        break;
      case 'manchester':
        val = Math.pow(sinc(u / 2) * Math.sin((Math.PI * u) / 2), 2);
        break;
    }
    psd.push(val);
  }
  return { fNorm, psd, dcImpulse };
}

export function simulateChannelAndEqualizer(params: {
  numBits: number;
  spb: number;
  channelFcRatio: number; // fc / Rb
  noiseSigma: number;
  enableCtle: boolean;
  ctleZeroRatio: number; // fz / Rb
  ctlePoleRatio: number; // fp / Rb
  enableDfe: boolean;
  dfeTap: number;
  ffePre: number;
  ffePost: number;
}) {
  const {
    numBits,
    spb,
    channelFcRatio,
    noiseSigma,
    enableCtle,
    ctleZeroRatio,
    ctlePoleRatio,
    enableDfe,
    dfeTap,
    ffePre,
    ffePost,
  } = params;

  const randn = createRng(1337);
  const bits: number[] = [];
  for (let i = 0; i < numBits; i++) {
    bits.push(randn() >= 0 ? 1 : 0);
  }
  const tx = encodeLineCode(bits, 'polar-nrz', spb, 1.0);
  const dt = 1 / spb; // normalized to Tb = 1

  // 1st-order Real LPF Channel (cascaded twice for realistic cable roll-off / ISI)
  const applyLpf = (sig: number[], fc: number) => {
    const wc = 2 * Math.PI * Math.max(0.05, fc);
    const k = 2 / dt;
    const a0 = 1 + k / wc;
    const b0 = 1 / a0;
    const b1 = 1 / a0;
    const a1 = (1 - k / wc) / a0;
    const out = new Array(sig.length).fill(0);
    for (let n = 1; n < sig.length; n++) {
      out[n] = b0 * sig[n] + b1 * sig[n - 1] - a1 * out[n - 1];
    }
    return out;
  };

  let rx = applyLpf(applyLpf(tx, channelFcRatio), channelFcRatio * 1.4);
  const noisyRx = rx.map((v) => v + randn() * noiseSigma);

  // CTLE: G(s) = (1 + s/wz) / (1 + s/wp), wz < wp
  let afterCtle = [...noisyRx];
  if (enableCtle) {
    const wz = 2 * Math.PI * Math.max(0.05, ctleZeroRatio);
    const wp = 2 * Math.PI * Math.max(ctleZeroRatio + 0.05, ctlePoleRatio);
    const k = 2 / dt;
    const a0 = 1 + k / wp;
    const b0 = (1 + k / wz) / a0;
    const b1 = (1 - k / wz) / a0;
    const a1 = (1 - k / wp) / a0;
    afterCtle = new Array(noisyRx.length).fill(0);
    for (let n = 1; n < noisyRx.length; n++) {
      afterCtle[n] = b0 * noisyRx[n] + b1 * noisyRx[n - 1] - a1 * afterCtle[n - 1];
    }
  }

  // Discrete-time 3-tap FFE + 1-tap DFE applied cleanly across the waveform
  let equalized = [...afterCtle];
  if (Math.abs(ffePre) > 1e-4 || Math.abs(ffePost) > 1e-4) {
    const ffeOut = new Array(afterCtle.length).fill(0);
    const mainTap = 1 - ffePre - ffePost;
    for (let n = 0; n < afterCtle.length; n++) {
      const pre = n + spb < afterCtle.length ? afterCtle[n + spb] : 0;
      const post = n - spb >= 0 ? afterCtle[n - spb] : 0;
      ffeOut[n] = ffePre * pre + mainTap * afterCtle[n] + ffePost * post;
    }
    equalized = ffeOut;
  }

  if (enableDfe && Math.abs(dfeTap) > 1e-4) {
    const dfeOut = [...equalized];
    let prevDecision = 0;
    for (let b = 0; b < numBits; b++) {
      const start = b * spb;
      const mid = start + Math.floor(spb / 2);
      for (let i = 0; i < spb; i++) {
        dfeOut[start + i] -= dfeTap * prevDecision;
      }
      prevDecision = dfeOut[mid] >= 0 ? 1 : -1;
    }
    equalized = dfeOut;
  }

  // Build Eye Diagram traces (2*Tb window, skipping first 3 bits for transient settle)
  const buildEye = (sig: number[]) => {
    const traces: number[][] = [];
    const win = 2 * spb;
    for (let b = 3; b < numBits - 2; b += 1) {
      traces.push(sig.slice(b * spb, b * spb + win));
    }
    return traces;
  };

  // Compute frequency responses in dB (0.05*Rb to 3*Rb)
  const freqAxis: number[] = [];
  const chDb: number[] = [];
  const ctleDb: number[] = [];
  const totalDb: number[] = [];
  for (let i = 0; i <= 150; i++) {
    const f = 0.05 + (2.95 * i) / 150;
    freqAxis.push(f);
    const hCh =
      (1 / Math.sqrt(1 + Math.pow(f / channelFcRatio, 2))) *
      (1 / Math.sqrt(1 + Math.pow(f / (channelFcRatio * 1.4), 2)));
    const hCtle = enableCtle
      ? Math.sqrt(1 + Math.pow(f / ctleZeroRatio, 2)) /
        Math.sqrt(1 + Math.pow(f / Math.max(ctleZeroRatio + 0.05, ctlePoleRatio), 2))
      : 1;
    chDb.push(20 * Math.log10(Math.max(1e-5, hCh)));
    ctleDb.push(20 * Math.log10(Math.max(1e-5, hCtle)));
    totalDb.push(20 * Math.log10(Math.max(1e-5, hCh * hCtle)));
  }

  // Estimate vertical eye opening at center sample
  const eyeEq = buildEye(equalized);
  const centerIdx = Math.floor(spb / 2);
  let minHigh = Infinity;
  let maxLow = -Infinity;
  for (const tr of eyeEq) {
    const v = tr[centerIdx];
    if (v >= 0) minHigh = Math.min(minHigh, v);
    else maxLow = Math.max(maxLow, v);
  }
  const eyeOpening =
    minHigh === Infinity || maxLow === -Infinity ? 0 : Math.max(0, minHigh - maxLow);

  return {
    tx,
    noisyRx,
    equalized,
    eyeRaw: buildEye(noisyRx),
    eyeEq,
    freqAxis,
    chDb,
    ctleDb,
    totalDb,
    eyeOpening,
  };
}

// ==========================================
// LECTURES 9, 10, 11: PASSBAND DIGITAL MODULATION
// ==========================================
export type PassbandScheme =
  | 'OOK'
  | '4-ASK'
  | 'BPSK'
  | 'QPSK'
  | '8-PSK'
  | '16-QAM'
  | 'BFSK';

export interface ConstellationPoint {
  bits: string;
  i: number;
  q: number;
}

export function getConstellation(scheme: PassbandScheme): {
  points: ConstellationPoint[];
  k: number; // bits per symbol
  axisLabel1: string;
  axisLabel2: string;
} {
  switch (scheme) {
    case 'OOK':
      return {
        k: 1,
        axisLabel1: 'φ₁(t)',
        axisLabel2: '',
        points: [
          { bits: '0', i: 0, q: 0 },
          { bits: '1', i: 1, q: 0 },
        ],
      };
    case '4-ASK':
      return {
        k: 2,
        axisLabel1: 'φ₁(t)',
        axisLabel2: '',
        points: [
          { bits: '00', i: -3, q: 0 },
          { bits: '01', i: -1, q: 0 },
          { bits: '11', i: 1, q: 0 },
          { bits: '10', i: 3, q: 0 },
        ],
      };
    case 'BPSK':
      return {
        k: 1,
        axisLabel1: 'φ₁(t)',
        axisLabel2: '',
        points: [
          { bits: '0', i: -1, q: 0 },
          { bits: '1', i: 1, q: 0 },
        ],
      };
    case 'QPSK': {
      // Exact Lecture 10 slide 4 mapping
      const s = Math.SQRT1_2;
      return {
        k: 2,
        axisLabel1: 'φ₁(t) [cos]',
        axisLabel2: 'φ₂(t) [sin]',
        points: [
          { bits: '10', i: s, q: -s },  // pi/4
          { bits: '00', i: -s, q: -s }, // 3pi/4
          { bits: '01', i: -s, q: s },  // 5pi/4
          { bits: '11', i: s, q: s },   // 7pi/4
        ],
      };
    }
    case '8-PSK': {
      const gray3 = ['000', '001', '011', '010', '110', '111', '101', '100'];
      return {
        k: 3,
        axisLabel1: 'φ₁(t) [cos]',
        axisLabel2: 'φ₂(t) [sin]',
        points: gray3.map((bits, idx) => {
          const theta = ((2 * (idx + 1) - 1) * Math.PI) / 8;
          return { bits, i: Math.cos(theta), q: -Math.sin(theta) };
        }),
      };
    }
    case '16-QAM': {
      // Gray-coded 4x4 grid matching Lecture 11 slide 6
      const levels = [-3, -1, 1, 3];
      const gray2 = ['00', '01', '11', '10'];
      const points: ConstellationPoint[] = [];
      for (let ix = 0; ix < 4; ix++) {
        for (let qy = 0; qy < 4; qy++) {
          points.push({
            bits: gray2[ix] + gray2[qy],
            i: levels[ix],
            q: levels[qy],
          });
        }
      }
      return {
        k: 4,
        axisLabel1: 'φ₁(t) [cos]',
        axisLabel2: 'φ₂(t) [sin]',
        points,
      };
    }
    case 'BFSK':
      return {
        k: 1,
        axisLabel1: 'φ₁(t) [f₁]',
        axisLabel2: 'φ₂(t) [f₂]',
        points: [
          { bits: '1', i: 1, q: 0 },
          { bits: '0', i: 0, q: 1 },
        ],
      };
  }
}

export function simulatePassband(
  scheme: PassbandScheme,
  bitString: string,
  fcCyclesPerSym: number,
  noiseStd: number
) {
  const { points, k, axisLabel1, axisLabel2 } = getConstellation(scheme);
  const cleanBits = bitString.replace(/[^01]/g, '') || '10110010';
  const paddedBits =
    cleanBits.length % k === 0
      ? cleanBits
      : cleanBits + '0'.repeat(k - (cleanBits.length % k));

  const symbols: ConstellationPoint[] = [];
  for (let idx = 0; idx < paddedBits.length; idx += k) {
    const chunk = paddedBits.slice(idx, idx + k);
    const pt = points.find((p) => p.bits === chunk) || points[0];
    symbols.push(pt);
  }

  const sps = 64; // samples per symbol
  const t: number[] = [];
  const waveform: number[] = [];
  const noisyWaveform: number[] = [];
  const randn = createRng(2026);

  // Max amplitude for normalization in time plot
  const maxAmp = Math.max(...points.map((p) => Math.hypot(p.i, p.q)), 1);

  symbols.forEach((sym, symIdx) => {
    for (let n = 0; n < sps; n++) {
      const localT = n / sps;
      const globalT = symIdx + localT;
      t.push(globalT);

      let sVal = 0;
      if (scheme === 'BFSK') {
        const f1 = fcCyclesPerSym;
        const f2 = fcCyclesPerSym + 2;
        sVal =
          sym.bits === '1'
            ? Math.cos(2 * Math.PI * f1 * localT)
            : Math.cos(2 * Math.PI * f2 * localT);
      } else {
        const phi1 = Math.cos(2 * Math.PI * fcCyclesPerSym * localT);
        const phi2 = Math.sin(2 * Math.PI * fcCyclesPerSym * localT);
        sVal = (sym.i * phi1 + sym.q * phi2) / maxAmp;
      }
      waveform.push(sVal);
      noisyWaveform.push(sVal + randn() * noiseStd * 0.6);
    }
  });

  // Noisy constellation scatter cloud + coherent correlator minimum-distance detection
  const rxCloud: { i: number; q: number; correct: boolean }[] = [];
  let bitErrors = 0;
  let totalTestedBits = 0;
  const decodedBitsList: string[] = [];

  // Decode actual user symbols
  const symRng = createRng(99);
  for (const sym of symbols) {
    const ri = sym.i + symRng() * noiseStd;
    const rq = sym.q + (axisLabel2 ? symRng() * noiseStd : 0);
    let best = points[0];
    let bestD = Infinity;
    for (const p of points) {
      const d = (ri - p.i) ** 2 + (rq - p.q) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    decodedBitsList.push(best.bits);
  }

  // Generate 160 cloud symbols for clean visual SNR intuition
  for (let n = 0; n < 160; n++) {
    const txSym = points[n % points.length];
    const ri = txSym.i + symRng() * noiseStd;
    const rq = txSym.q + (axisLabel2 ? symRng() * noiseStd : 0);
    let best = points[0];
    let bestD = Infinity;
    for (const p of points) {
      const d = (ri - p.i) ** 2 + (rq - p.q) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    const correct = best.bits === txSym.bits;
    rxCloud.push({ i: ri, q: rq, correct });
    for (let b = 0; b < k; b++) {
      if (best.bits[b] !== txSym.bits[b]) bitErrors++;
      totalTestedBits++;
    }
  }

  // Passband PSD centered around fc (normalized to bit rate Rb)
  const fcNorm = fcCyclesPerSym;
  const fPsd: number[] = [];
  const psdVal: number[] = [];
  const fMin = Math.max(0, fcNorm - 3.5);
  const fMax = fcNorm + 5.5;
  for (let i = 0; i <= 260; i++) {
    const f = fMin + ((fMax - fMin) * i) / 260;
    fPsd.push(f);
    if (scheme === 'BFSK') {
      const s1 = Math.pow(sinc(f - fcNorm), 2);
      const s2 = Math.pow(sinc(f - (fcNorm + 2)), 2);
      psdVal.push(0.5 * (s1 + s2));
    } else {
      // Baseband symbol duration T = k * Tb => PSD ~ k * sinc^2((f - fc) * k)
      psdVal.push(k * Math.pow(sinc((f - fcNorm) * k), 2));
    }
  }

  return {
    t,
    waveform,
    noisyWaveform,
    points,
    rxCloud,
    k,
    axisLabel1,
    axisLabel2,
    paddedBits,
    decodedBits: decodedBitsList.join(''),
    ber: totalTestedBits > 0 ? bitErrors / totalTestedBits : 0,
    fPsd,
    psdVal,
  };
}