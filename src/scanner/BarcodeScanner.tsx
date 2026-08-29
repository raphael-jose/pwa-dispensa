import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library';
import { Camera, Flashlight, FlashlightOff, X, Keyboard } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string, format: string) => void;
  onClose: () => void;
}

const ALLOWED_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX
];

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(true);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (manualMode) {
      stopScanning();
      return;
    }

    let cancelled = false;

    async function startScanning() {
      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setScanning(true);

        reader.decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
          if (cancelled) return;
          if (result) {
            const format = result.getBarcodeFormat();
            if (ALLOWED_FORMATS.includes(format)) {
              stopScanning();
              onScan(result.getText(), BarcodeFormat[format] || 'unknown');
            }
          }
        });
      } catch (err) {
        if (!cancelled) {
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            setError('Precisamos da permissão da câmera para escanear produtos.');
          } else {
            setError('Não foi possível acessar a câmera. Tente o modo manual.');
          }
        }
      }
    }

    startScanning();

    return () => {
      cancelled = true;
      stopScanning();
    };
  }, [manualMode, onScan, stopScanning]);

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as MediaTrackConstraintSet]
      });
      setFlashOn(!flashOn);
    } catch {
      // Flash not supported
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim(), 'manual');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 text-white z-10">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">
          <X size={24} />
        </button>
        <h2 className="text-lg font-semibold">Escanear Produto</h2>
        <button
          onClick={() => setManualMode(!manualMode)}
          className="p-2 rounded-full hover:bg-white/20"
        >
          {manualMode ? <Camera size={24} /> : <Keyboard size={24} />}
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-white">
            <Camera size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">{error}</p>
            <button
              onClick={() => { setError(''); setManualMode(true); }}
              className="mt-4 px-6 py-3 bg-brand-600 rounded-xl font-medium"
            >
              Digitar código manualmente
            </button>
          </div>
        </div>
      ) : manualMode ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <form onSubmit={handleManualSubmit} className="w-full max-w-sm space-y-4">
            <div className="text-center text-white mb-6">
              <Keyboard size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">Digite o código de barras</p>
            </div>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex: 7891234567890"
              className="w-full p-4 text-lg text-center bg-white/10 text-white border border-white/30 rounded-xl focus:outline-none focus:border-brand-400"
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="w-full p-4 bg-brand-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50"
            >
              Buscar Produto
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-72 h-40 border-2 border-white/60 rounded-2xl relative">
              {scanning && (
                <div className="absolute inset-x-0 h-0.5 bg-brand-400 animate-scan" />
              )}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 p-6 flex justify-center">
            <p className="text-white/80 text-sm bg-black/50 px-4 py-2 rounded-full">
              Posicione o código de barras dentro da moldura
            </p>
          </div>
        </div>
      )}

      {/* Flash toggle */}
      {!manualMode && !error && (
        <button
          onClick={toggleFlash}
          className="absolute top-20 right-4 p-3 bg-black/50 text-white rounded-full z-10"
        >
          {flashOn ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
        </button>
      )}
    </div>
  );
}
