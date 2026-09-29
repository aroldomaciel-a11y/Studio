import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode as QrIcon } from 'lucide-react';

interface QRCodeDisplayProps {
  pinCode: string;
  lanIp: string;
  port: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  pinCode,
  lanIp,
  port,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const connectionPayload = JSON.stringify({
    app: 'MixLink',
    v: 1,
    ip: lanIp,
    port: port,
    pin: pinCode,
    proto: 'webrtc-rtp-opus',
  });

  useEffect(() => {
    QRCode.toDataURL(connectionPayload, {
      width: 220,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR', err));
  }, [connectionPayload]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`mixlink://${lanIp}:${port}?pin=${pinCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <QrIcon className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-neutral-200">
          QR Code de Conexão Rápida
        </span>
      </div>

      {/* QR Image Box */}
      <div className="p-3 bg-white rounded-xl shadow-lg mb-3">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="MixLink Pairing QR Code"
            className="w-44 h-44 rounded-md"
          />
        ) : (
          <div className="w-44 h-44 bg-neutral-200 animate-pulse rounded-md" />
        )}
      </div>

      {/* 6-Digit PIN Display */}
      <div className="flex flex-col items-center mb-3">
        <span className="text-[11px] text-neutral-400 mb-0.5">
          PIN de 6 Dígitos
        </span>
        <div className="px-4 py-1.5 bg-neutral-950 border border-amber-500/40 rounded-lg text-amber-400 font-mono text-xl font-bold tracking-widest">
          {pinCode}
        </div>
      </div>

      {/* Server LAN details */}
      <div className="w-full flex items-center justify-between text-[11px] font-mono text-neutral-400 pt-2 border-t border-neutral-800">
        <span>{lanIp}:{port}</span>
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1 text-neutral-300 hover:text-amber-400 transition-colors p-1"
          title="Copiar endereço de conexão"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
    </div>
  );
};
