import { StemId } from '../types/mixlink';

export interface StemLevels {
  drums: { peak: number; rms: number };
  bass: { peak: number; rms: number };
  guitars: { peak: number; rms: number };
  vocals_keys: { peak: number; rms: number };
  master: { peak: number; rms: number };
}

export class MixLinkAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private isRecording = false;
  private audioSource: 'bandlab_auv3' | 'system_loopback' | 'mic_input' | 'simulated_stems' = 'simulated_stems';

  // Nodes for stems
  private stemGains: Record<StemId, GainNode | null> = {
    drums: null,
    bass: null,
    guitars: null,
    vocals_keys: null,
  };

  private stemPanners: Record<StemId, StereoPannerNode | null> = {
    drums: null,
    bass: null,
    guitars: null,
    vocals_keys: null,
  };

  private stemAnalysers: Record<StemId, AnalyserNode | null> = {
    drums: null,
    bass: null,
    guitars: null,
    vocals_keys: null,
  };

  private stemInputs: Record<StemId, GainNode | null> = {
    drums: null,
    bass: null,
    guitars: null,
    vocals_keys: null,
  };

  // Master chain
  private masterGain: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private monoNode: ChannelMergerNode | null = null;

  // External audio stream (mic/loopback)
  private externalStream: MediaStream | null = null;
  private externalSourceNode: MediaStreamAudioSourceNode | null = null;

  // Synthesizer loop timer
  private loopInterval: number | null = null;
  private step = 0;
  private bpm = 112;

  // Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingDestination: MediaStreamAudioDestinationNode | null = null;
  private onRecordCompleteCallback: ((blob: Blob) => void) | null = null;

  // Level monitoring callback
  private meterCallback: ((levels: StemLevels) => void) | null = null;
  private meterAnimFrame: number | null = null;

  constructor() {
    // Lazy initialize on first user gesture
  }

  public async initContext(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 48000, latencyHint: 'interactive' });
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.setupNodes();
  }

  private setupNodes(): void {
    if (!this.ctx) return;

    // Master Limiter (Ear Safety Protection)
    this.limiterNode = this.ctx.createDynamicsCompressor();
    this.limiterNode.threshold.value = -0.5; // dB
    this.limiterNode.knee.value = 3;
    this.limiterNode.ratio.value = 20; // Hard limiting
    this.limiterNode.attack.value = 0.001; // 1 ms
    this.limiterNode.release.value = 0.05; // 50 ms

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;

    // Master Analyser
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterAnalyser.smoothingTimeConstant = 0.3;

    // Connect master chain
    this.masterGain.connect(this.limiterNode);
    this.limiterNode.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Setup recording destination node
    this.recordingDestination = this.ctx.createMediaStreamDestination();
    this.limiterNode.connect(this.recordingDestination);

    // Setup 4 stem channels
    const stemIds: StemId[] = ['drums', 'bass', 'guitars', 'vocals_keys'];
    for (const id of stemIds) {
      const input = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      const gain = this.ctx.createGain();
      const analyser = this.ctx.createAnalyser();

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;

      input.connect(gain);
      gain.connect(panner);
      panner.connect(analyser);
      analyser.connect(this.masterGain);

      this.stemInputs[id] = input;
      this.stemGains[id] = gain;
      this.stemPanners[id] = panner;
      this.stemAnalysers[id] = analyser;
    }

    this.startMeteringLoop();
  }

  public setMeterCallback(cb: (levels: StemLevels) => void): void {
    this.meterCallback = cb;
  }

  private startMeteringLoop(): void {
    if (this.meterAnimFrame) cancelAnimationFrame(this.meterAnimFrame);

    const dataArray = new Float32Array(128);

    const calculateLevel = (analyser: AnalyserNode | null) => {
      if (!analyser) return { peak: 0, rms: 0 };
      analyser.getFloatTimeDomainData(dataArray);

      let peak = 0;
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const val = Math.abs(dataArray[i]);
        if (val > peak) peak = val;
        sumSquares += val * val;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);
      return { peak: Math.min(1.2, peak), rms: Math.min(1.0, rms) };
    };

    const tick = () => {
      if (this.meterCallback && this.ctx) {
        const levels: StemLevels = {
          drums: calculateLevel(this.stemAnalysers.drums),
          bass: calculateLevel(this.stemAnalysers.bass),
          guitars: calculateLevel(this.stemAnalysers.guitars),
          vocals_keys: calculateLevel(this.stemAnalysers.vocals_keys),
          master: calculateLevel(this.masterAnalyser),
        };
        this.meterCallback(levels);
      }
      this.meterAnimFrame = requestAnimationFrame(tick);
    };

    this.meterAnimFrame = requestAnimationFrame(tick);
  }

  // --- Real Stem Synthesizer for Demo & Testing ---
  public async startAudio(): Promise<void> {
    await this.initContext();
    if (!this.ctx) return;

    if (this.audioSource === 'mic_input' || this.audioSource === 'system_loopback') {
      await this.startExternalCapture();
    } else {
      this.startSynthesizer();
    }

    this.isPlaying = true;
  }

  public stopAudio(): void {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.externalStream) {
      this.externalStream.getTracks().forEach((track) => track.stop());
      this.externalStream = null;
    }
    this.isPlaying = false;
  }

  public isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  public setAudioSource(source: 'bandlab_auv3' | 'system_loopback' | 'mic_input' | 'simulated_stems'): void {
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.stopAudio();
    this.audioSource = source;
    if (wasPlaying) this.startAudio();
  }

  public getAudioSource(): string {
    return this.audioSource;
  }

  private async startExternalCapture(): Promise<void> {
    if (!this.ctx) return;
    try {
      this.externalStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2,
        },
      });

      this.externalSourceNode = this.ctx.createMediaStreamSource(this.externalStream);

      // Route external input into stems with bandpass filters to simulate 4-stem separation
      // 1. Drums (Low punch & transients)
      const drumFilter = this.ctx.createBiquadFilter();
      drumFilter.type = 'lowpass';
      drumFilter.frequency.value = 220;

      // 2. Bass (Sub & low-mids 80Hz - 400Hz)
      const bassFilter = this.ctx.createBiquadFilter();
      bassFilter.type = 'bandpass';
      bassFilter.frequency.value = 160;
      bassFilter.Q.value = 1.2;

      // 3. Guitars (Mid-range 400Hz - 3.5kHz)
      const guitarFilter = this.ctx.createBiquadFilter();
      guitarFilter.type = 'bandpass';
      guitarFilter.frequency.value = 1400;
      guitarFilter.Q.value = 0.9;

      // 4. Vocals & Keys (High-mids & clarity 1kHz - 8kHz)
      const vocalFilter = this.ctx.createBiquadFilter();
      vocalFilter.type = 'highpass';
      vocalFilter.frequency.value = 800;

      if (this.stemInputs.drums) {
        this.externalSourceNode.connect(drumFilter);
        drumFilter.connect(this.stemInputs.drums);
      }
      if (this.stemInputs.bass) {
        this.externalSourceNode.connect(bassFilter);
        bassFilter.connect(this.stemInputs.bass);
      }
      if (this.stemInputs.guitars) {
        this.externalSourceNode.connect(guitarFilter);
        guitarFilter.connect(this.stemInputs.guitars);
      }
      if (this.stemInputs.vocals_keys) {
        this.externalSourceNode.connect(vocalFilter);
        vocalFilter.connect(this.stemInputs.vocals_keys);
      }
    } catch {
      // Fallback to simulated stems if mic access is not granted
      this.startSynthesizer();
    }
  }

  private startSynthesizer(): void {
    if (this.loopInterval) clearInterval(this.loopInterval);

    const stepDurationMs = (60 / this.bpm / 4) * 1000; // 16th notes
    this.step = 0;

    this.loopInterval = window.setInterval(() => {
      this.playSequencerStep(this.step);
      this.step = (this.step + 1) % 32; // 2 bars
    }, stepDurationMs);
  }

  private playSequencerStep(step: number): void {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;

    // --- STEM 1: DRUMS ---
    const drumInput = this.stemInputs.drums;
    if (drumInput) {
      // Kick: on steps 0, 4, 8, 12, 16, 20, 24, 28 (plus groove kicks on 10, 26)
      if (step % 4 === 0 || step === 10 || step === 26) {
        this.playKick(now, drumInput);
      }
      // Snare: on backbeats 4, 12, 20, 28
      if (step % 8 === 4) {
        this.playSnare(now, drumInput);
      }
      // Hi-Hat: 8th notes and 16th accents
      if (step % 2 === 0 || step % 4 === 3) {
        this.playHiHat(now, drumInput, step % 4 === 0);
      }
    }

    // --- STEM 2: BASS ---
    const bassInput = this.stemInputs.bass;
    if (bassInput) {
      // Bassline in D minor / G / Bb / A
      const bassNotes = [36.7, 36.7, 43.65, 43.65, 41.2, 41.2, 38.89, 38.89]; // D1, F1, G1, A1 (Hz)
      const barIndex = Math.floor(step / 8);
      const noteHz = [73.42, 82.41, 65.41, 55.0][barIndex % 4]; // D2, E2, C2, A1
      if (step % 2 === 0) {
        this.playBassNote(now, noteHz, bassInput, step % 8 === 0 ? 0.35 : 0.18);
      }
    }

    // --- STEM 3: GUITARS ---
    const guitarInput = this.stemInputs.guitars;
    if (guitarInput) {
      // Funky rhythm strums on offbeats: 2, 6, 10, 14, 18, 22, 26, 30
      if (step % 4 === 2) {
        this.playGuitarStrum(now, step, guitarInput);
      }
    }

    // --- STEM 4: VOCALS & KEYS ---
    const vocalKeysInput = this.stemInputs.vocals_keys;
    if (vocalKeysInput) {
      // Rhodes chords held on step 0, 8, 16, 24
      if (step % 8 === 0) {
        this.playKeysChord(now, Math.floor(step / 8), vocalKeysInput);
      }
      // Vocal hook snippet on steps 4..12 of bar 2
      if (step === 16 || step === 20 || step === 24) {
        this.playVocalFormant(now, step, vocalKeysInput);
      }
    }
  }

  private playKick(time: number, dest: AudioNode): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  private playSnare(time: number, dest: AudioNode): void {
    if (!this.ctx) return;
    // Tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(65, time + 0.1);
    oscGain.gain.setValueAtTime(0.4, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.15);

    // Noise snap
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 900;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);

    noise.start(time);
    noise.stop(time + 0.22);
  }

  private playHiHat(time: number, dest: AudioNode, accent: boolean): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.35 : 0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (accent ? 0.06 : 0.035));

    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    source.start(time);
    source.stop(time + 0.07);
  }

  private playBassNote(time: number, freq: number, dest: AudioNode, dur: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + dur);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  private playGuitarStrum(time: number, step: number, dest: AudioNode): void {
    if (!this.ctx) return;
    // Chords (D min, F maj, C maj, G sus)
    const chordFreqs = [
      [220, 261.63, 329.63], // A3, C4, E4
      [261.63, 329.63, 392], // C4, E4, G4
      [196, 246.94, 293.66], // G3, B3, D4
      [220, 293.66, 349.23], // A3, D4, F4
    ];
    const freqs = chordFreqs[Math.floor(step / 8) % 4];

    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq * 1.5, time + idx * 0.015);

      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 2.0;

      gain.gain.setValueAtTime(0.22, time + idx * 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(time + idx * 0.015);
      osc.stop(time + 0.2);
    });
  }

  private playKeysChord(time: number, chordIndex: number, dest: AudioNode): void {
    if (!this.ctx) return;
    const chords = [
      [293.66, 349.23, 440.0, 523.25], // Dm7: D4, F4, A4, C5
      [349.23, 440.0, 523.25, 659.25], // Fmaj7: F4, A4, C5, E5
      [261.63, 329.63, 392.0, 493.88], // Cmaj7: C4, E4, G4, B4
      [220.0, 293.66, 349.23, 440.0],  // Dm/A: A3, D4, F4, A4
    ];
    const notes = chords[chordIndex % chords.length];

    notes.forEach((f) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);

      gain.gain.setValueAtTime(0.14, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(time);
      osc.stop(time + 1.3);
    });
  }

  private playVocalFormant(time: number, step: number, dest: AudioNode): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    const pitch = step === 16 ? 440 : step === 20 ? 493.88 : 523.25; // A4, B4, C5
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1050, time); // "Ah" vocal formant
    filter.Q.value = 5.0;

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.38);
  }

  // --- Real-time Mix Controls ---
  public updateStemMix(
    stemId: StemId,
    mix: { volume: number; pan: number; muted: boolean; solo: boolean },
    anySoloActive: boolean
  ): void {
    if (!this.ctx) return;
    const gainNode = this.stemGains[stemId];
    const pannerNode = this.stemPanners[stemId];

    if (gainNode) {
      let targetGain = mix.volume;
      if (mix.muted) {
        targetGain = 0;
      } else if (anySoloActive && !mix.solo) {
        targetGain = 0;
      }
      gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
    }

    if (pannerNode) {
      pannerNode.pan.setTargetAtTime(mix.pan, this.ctx.currentTime, 0.02);
    }
  }

  public setMasterVolume(vol: number): void {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.02);
    }
  }

  public setLimiterEnabled(enabled: boolean): void {
    if (!this.limiterNode || !this.ctx) return;
    // When enabled, hard limiting at -0.5 dB; when disabled, transparent threshold (+6dB)
    this.limiterNode.threshold.setTargetAtTime(enabled ? -0.5 : 6.0, this.ctx.currentTime, 0.01);
  }

  public setStereoMode(isStereo: boolean): void {
    // When mono, all stem panners collapse to 0
    if (!isStereo) {
      for (const p of Object.values(this.stemPanners)) {
        if (p && this.ctx) p.pan.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      }
    }
  }

  // --- Safety WAV Recorder ---
  public startSafetyRecording(onComplete: (blob: Blob) => void): boolean {
    if (!this.recordingDestination || !this.ctx) return false;
    this.onRecordCompleteCallback = onComplete;
    this.recordedChunks = [];

    try {
      this.mediaRecorder = new MediaRecorder(this.recordingDestination.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
    } catch {
      this.mediaRecorder = new MediaRecorder(this.recordingDestination.stream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const recordedBlob = new Blob(this.recordedChunks, { type: 'audio/wav' });
      if (this.onRecordCompleteCallback) {
        this.onRecordCompleteCallback(recordedBlob);
      }
    };

    this.mediaRecorder.start(250); // Emit chunk every 250ms
    this.isRecording = true;
    return true;
  }

  public stopSafetyRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  public isSafetyRecording(): boolean {
    return this.isRecording;
  }
}

// Global singleton instance
export const audioEngine = new MixLinkAudioEngine();
