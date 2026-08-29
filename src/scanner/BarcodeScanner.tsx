import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, X, RefreshCw } from 'lucide-react';

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
  const [scanning, setScanning] = useState(false);
  const [method, setMethod] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const lastCodeRef = useRef<string>('');
  const lastCodeTimeRef = useRef<number>(0);
  const isActiveRef = useRef(false);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setScanning(false);

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
        isActiveRef.current = true;

        // Check for flash support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities?.torch) {
          setHasFlash(true);
        }

        // Start scanning after camera is ready
        setTimeout(() => startScanning(), 500);
      }
    } catch (err: any) {
      console.error('[Scanner] Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Precisamos da permissão da câmera para escanear produtos.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada neste dispositivo.');
      } else {
        setError('Não foi possível acessar a câmera. Tente o cadastro manual.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    setScanning(false);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    detectorRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startScanning = useCallback(async () => {
    if (!videoRef.current || !isActiveRef.current) return;

    // Method 1: Try native BarcodeDetector API (Chrome, Edge, some Android)
    if ('BarcodeDetector' in window) {
      try {
        const formats = await (BarcodeDetector as any).getSupportedFormats();
        console.log('[Scanner] BarcodeDetector available, formats:', formats);

        const detector = new (BarcodeDetector as any)({
          formats: formats.filter((f: string) =>
            f.includes('ean') || f.includes('upc') || f.includes('qr') || f.includes('code_128')
          )
        });

        detectorRef.current = detector;
        setMethod('BarcodeDetector (nativo)');
        setScanning(true);

        console.log('[Scanner] Using native BarcodeDetector API');
        scanWithDetector(detector);
        return;
      } catch (err) {
        console.warn('[Scanner] BarcodeDetector init failed:', err);
      }
    }

    // Method 2: Fallback to ZXing
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library');

      if (!isActiveRef.current) return;

      const reader = new BrowserMultiFormatReader();
      setMethod('ZXing (fallback)');
      setScanning(true);

      console.log('[Scanner] Using ZXing library as fallback');

      reader.decodeFromVideoElement(videoRef.current).then(
        (result: any) => {
          if (!isActiveRef.current) return;
          if (result) {
            handleCodeDetected(result.getText());
          }
        },
        () => {
          // Error during scanning - keep trying
          if (isActiveRef.current && videoRef.current) {
            setTimeout(() => {
              if (isActiveRef.current && videoRef.current && reader) {
                reader.decodeFromVideoElement(videoRef.current).catch(() => {});
              }
            }, 300);
          }
        }
      );
    } catch (err) {
      console.error('[Scanner] ZXing init error:', err);
      setScanning(false);
      setError('Scanner não disponível. Use o cadastro manual.');
    }
  }, []);

  const scanWithDetector = useCallback((detector: any) => {
    if (!videoRef.current || !isActiveRef.current) return;

    const scanFrame = async () => {
      if (!videoRef.current || !isActiveRef.current) return;

      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes && barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          if (code) {
            handleCodeDetected(code);
            return;
          }
        }
      } catch (err) {
        // Detection error, continue
      }

      // Continue scanning
      if (isActiveRef.current) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, []);

  const handleCodeDetected = useCallback((code: string) => {
    const now = Date.now();

    // Debounce: same code within 3 seconds
    if (code === lastCodeRef.current && now - lastCodeTimeRef.current < 3000) {
      // Continue scanning
      if (isActiveRef.current && videoRef.current) {
        if (detectorRef.current) {
          scanWithDetector(detectorRef.current);
        }
      }
      return;
    }

    lastCodeRef.current = code;
    lastCodeTimeRef.current = now;

    console.log('[Scanner] Code detected:', code, 'method:', method);

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Stop and send to parent
    stopCamera();
    onScan(code);
  }, [onScan, stopCamera, method, scanWithDetector]);

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
  }, []);

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
          {/* Dark overlay around scan area */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Scan frame (transparent center) */}
          <div className="relative w-64 h-64 bg-transparent">
            {/* Corner marks */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-400 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-400 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-400 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-400 rounded-br-2xl" />

            {/* Scan line animation */}
            {isActive && scanning && (
              <div className="absolute left-4 right-4 h-0.5 bg-green-400 shadow-lg shadow-green-400/50 animate-scan" />
            )}
          </div>
        </div>

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-2">
            {scanning && (
              <span className="px-3 py-1 bg-green-500/80 text-white text-xs rounded-full flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Escaneando...
              </span>
            )}

            {hasFlash && (
              <button
                onClick={toggleFlash}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  flashOn ? 'bg-yellow-500 text-black' : 'bg-black/50 text-white'
                }`}
              >
                <Camera size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-center z-10">
          {error ? (
            <div className="space-y-3">
              <CameraOff size={40} className="mx-auto text-red-400" />
              <p className="text-white text-sm">{error}</p>
              <button
                onClick={() => { setError(null); startCamera(); }}
                className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 mx-auto"
              >
                <RefreshCw size={16} /> Tentar novamente
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-white text-sm font-medium">
                Posicione o código de barras dentro da moldura
              </p>
              {method && (
                <p className="text-green-400/80 text-xs">
                  ✓ {method}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
