export type StemId = 'drums' | 'bass' | 'guitars' | 'vocals_keys';

export interface StemInfo {
  id: StemId;
  name: string;
  shortName: string;
  color: string;
  iconName: 'drums' | 'bass' | 'guitar' | 'mic';
  frequencyRange: string;
  defaultPan: number; // -1 to 1
}

export interface StemMix {
  volume: number; // 0 to 1.25 (0 to +6dB), 1.0 is unity (0 dB)
  pan: number;    // -1 (Left) to +1 (Right)
  muted: boolean;
  solo: boolean;
}

export interface MusicianProfile {
  id: string;
  slot: 1 | 2 | 3 | 4;
  name: string;
  instrument: string;
  avatarColor: string;
  connected: boolean;
  ipAddress: string;
  latencyMs: number;
  jitterMs: number;
  packetLoss: number;
  batteryPercent: number;
  wifiSignalDbm: number;
  audioOutput: 'p2' | 'usb_dac' | 'bluetooth_ll';
  isStereo: boolean;
  limiterActive: boolean;
  stems: Record<StemId, StemMix>;
  masterVolume: number;
}

export interface ServerState {
  isRunning: boolean;
  lanIp: string;
  port: number;
  pinCode: string;
  sampleRate: number; // 48000
  bitrateKbps: number; // 64 per channel
  bufferSize: number; // 128 samples
  audioSource: 'bandlab_auv3' | 'system_loopback' | 'mic_input' | 'simulated_stems';
  isRecording: boolean;
  recordingSeconds: number;
  recordedBlobUrl: string | null;
  recordedSizeMb: number;
}

export interface NetworkHealth {
  rttMs: number;
  jitterMs: number;
  packetLossPct: number;
  band5Ghz: boolean;
  bandwidthKbps: number;
  dtlsEncrypted: boolean;
}
