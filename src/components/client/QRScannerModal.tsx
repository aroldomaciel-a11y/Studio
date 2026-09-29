import React, { useState } from 'react';
import { QrCode, X, Wifi, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverPin: string;
  serverIp: string;
  onConnect: (pin: string) => void;
  isConnected: boolean;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  serverPin,
  serverIp,
  onConnect,
  isConnected,
}) => {
  const [pinInput, setPinInput] = useState(serverPin);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSimulatedScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(true);
      setPinInput(serverPin);
      setTimeout(() => {
        onConnect(serverPin);
        onClose();
        setScanSuccess(false);
      }, 700);
    }, 1200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim().length === 6) {
      onConnect(pinInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-100">
              Conectar ao MixLink Server
            </h3>
            <p className="text-xs text-neutral-400">
              Rede Local Wi-Fi 5 GHz · Sem conexão externa
            </p>
          </div>
        </div>

        {/* QR Code Camera viewfinder simulation */}
        <div className="relative aspect-square max-w-[240px] mx-auto bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex flex-col items-center justify-center mb-5 p-4">
          {scanSuccess ? (
            <div className="flex flex-col items-center gap-2 text-emerald-400 animate-scale-up">
              <CheckCircle2 className="w-12 h-12" />
              <span className="text-xs font-semibold">Pareado com Sucesso!</span>
              <span className="text-[10px] font-mono text-neutral-400">{serverIp}</span>
            </div>
          ) : isScanning ? (
            <div className="flex flex-col items-center gap-3 text-amber-400 w-full">
              <div className="w-full h-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-bounce" />
              <span className="text-xs font-mono animate-pulse">Lendo QR Code do Servidor...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 border-2 border-dashed border-neutral-600 rounded-lg flex items-center justify-center text-neutral-500">
                <QrCode className="w-8 h-8" />
              </div>
              <button
                type="button"
                onClick={handleSimulatedScan}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 rounded-lg transition-colors border border-neutral-700"
              >
                Escanear Câmera (Simular)
              </button>
            </div>
          )}

          {/* Corner target reticles */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-amber-400 pointer-events-none" />
        </div>

        {/* Manual 6-Digit PIN Form */}
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Ou digite o código de 6 dígitos mostrado no servidor:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="6 dígitos"
                className="w-full h-11 px-3 bg-neutral-950 border border-neutral-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-lg font-mono text-center text-lg tracking-widest text-white outline-none"
              />
              <button
                type="submit"
                disabled={pinInput.length !== 6}
                className="min-h-[44px] px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none text-neutral-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <span>Entrar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Security & LAN info */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              Servidor IP: <span className="font-mono text-neutral-300">{serverIp}</span>
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              DTLS Criptografado
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};
