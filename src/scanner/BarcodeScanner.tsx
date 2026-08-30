import { useEffect, useRef, useCallback, useState } from 'react';
import { Camera, CameraOff, X, RefreshCw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const SCANNER_ELEMENT_ID = 'barcode-reader';

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastCodeRef = useRef<string>('');
  const lastCodeTimeRef = useRef<number>(0);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch {
      // Ignore errors on stop
    }
    scannerRef.current = null;
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    try {
      setError(null);

      // Clean up any existing scanner
      await stopScanner();

      const html5Qrcode = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce: same code within 3 seconds
          if (decodedText === lastCodeRef.current && now - lastCodeTimeRef.current < 3000) {
            return;
          }

          lastCodeRef.current = decodedText;
          lastCodeTimeRef.current = now;

          console.log('[Scanner] ✅ Código detectado:', decodedText);

          // Vibrate
          if (navigator.vibrate) navigator.vibrate(200);

          // Stop and notify parent
          stopScanner().then(() => onScan(decodedText));
        },
        () => {
          // Scan error (no code found in frame) — ignore, keep scanning
        }
      );

      setIsScanning(true);
      console.log('[Scanner] Câmera iniciada com html5-qrcode');
    } catch (err: any) {
      console.error('[Scanner] Erro ao iniciar câmera:', err);
      if (err?.message?.includes('NotAllowedError') || err?.toString()?.includes('permission')) {
        setError('Precisamos da permissão da câmera para escanear produtos.');
      } else if (err?.message?.includes('NotFoundError') || err?.toString()?.includes('not found')) {
        setError('Nenhuma câmera encontrada neste dispositivo.');
      } else {
        setError('Não foi possível acessar a câmera. Tente o cadastro manual.');
      }
      setIsScanning(false);
    }
  }, [onScan, stopScanner]);

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Scanner container */}
      <div className="relative w-full h-full">
        {/* html5-qrcode renders here */}
        <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />

        {/* Custom overlay on top of the scanner */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Scan frame guide */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-72 h-40">
              {/* Corner marks */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
            </div>
          </div>
        </div>

        {/* Top bar with close button */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-auto">
          <button
            onClick={() => { stopScanner(); onClose(); }}
            className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-2">
            {isScanning && (
              <span className="px-3 py-1 bg-green-500/80 text-white text-xs rounded-full flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Escaneando...
              </span>
            )}
          </div>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-center z-20 pointer-events-auto">
          {error ? (
            <div className="space-y-3">
              <CameraOff size={40} className="mx-auto text-red-400" />
              <p className="text-white text-sm">{error}</p>
              <button
                onClick={() => { setError(null); startScanner(); }}
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
              <p className="text-green-400/80 text-xs">
                ✓ html5-qrcode (lib testada)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
