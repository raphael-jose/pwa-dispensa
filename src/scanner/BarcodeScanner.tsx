import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastCodeRef = useRef<string>('');
  const lastCodeTimeRef = useRef<number>(0);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsActive(true);

        // Check for flash support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities?.torch) {
          setHasFlash(true);
        }
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Precisamos da permissão da câmera para escanear produtos.');
      } else {
        setError('Não foi possível acessar a câmera.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setIsActive(false);
  }, []);

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as any],
      });
      setFlashOn(!flashOn);
    } catch {
      // Flash not supported
    }
  }, [flashOn]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // ZXing scanner using BrowserBarcodeReader
  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    let cancelled = false;
    let reader: any = null;

    async function initScanner() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/library');
        reader = new BrowserMultiFormatReader();

        if (!videoRef.current || cancelled) return;

        reader.decodeFromVideoElement(videoRef.current).then(
          (result: any) => {
            if (cancelled) return;
            if (result) {
              const code = result.getText();
              const now = Date.now();

              // Debounce: same code within 3 seconds
              if (code === lastCodeRef.current && now - lastCodeTimeRef.current < 3000) {
                // Continue scanning
                if (!cancelled && videoRef.current) {
                  reader.decodeFromVideoElement(videoRef.current).then(/* ignore */);
                }
                return;
              }

              lastCodeRef.current = code;
              lastCodeTimeRef.current = now;

              // Vibrate if supported
              if (navigator.vibrate) {
                navigator.vibrate(200);
              }

              // Pause scanner
              stopCamera();
              onScan(code);
            }
          },
          () => {
            // Error during scanning - continue trying after a short delay
            if (!cancelled && videoRef.current && isActive) {
              setTimeout(() => {
                if (!cancelled && videoRef.current && reader) {
                  reader.decodeFromVideoElement(videoRef.current).then(/* ignore */);
                }
              }, 500);
            }
          }
        );
      } catch (err) {
        console.warn('ZXing not available, manual entry only:', err);
      }
    }

    initScanner();

    return () => {
      cancelled = true;
      if (reader) {
        try { reader.reset(); } catch {}
      }
    };
  }, [isActive, onScan, stopCamera]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Camera view */}
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Overlay with scan area */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Scan frame */}
          <div className="relative w-64 h-64">
            {/* Corner marks */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-500 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-500 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-500 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-500 rounded-br-lg" />

            {/* Scan line animation */}
            {isActive && (
              <div className="absolute left-2 right-2 h-0.5 bg-brand-500 shadow-lg shadow-brand-500/50 animate-scan" />
            )}
          </div>
        </div>

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center"
          >
            <X size={20} />
          </button>

          {hasFlash && (
            <button
              onClick={toggleFlash}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                flashOn ? 'bg-yellow-500 text-black' : 'bg-black/40 text-white'
              }`}
            >
              <Camera size={20} />
            </button>
          )}
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-center">
          {error ? (
            <div className="space-y-2">
              <CameraOff size={32} className="mx-auto text-red-400" />
              <p className="text-white text-sm">{error}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <p className="text-white/80 text-sm">
              Posicione o código de barras dentro da moldura
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
