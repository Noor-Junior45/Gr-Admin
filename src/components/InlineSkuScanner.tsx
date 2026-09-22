import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OrderItem } from '../types';
import {
  X,
  ScanBarcode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Check,
  Zap,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const getEffectiveSku = (item: OrderItem): string => {
  if (item.sku && item.sku.trim()) return item.sku.trim();
  if (item.product_id) {
    const clean = item.product_id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
    return `SKU-${clean}`;
  }
  const cleanId = item.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
  return `SKU-${cleanId}`;
};

interface InlineSkuScannerProps {
  items: OrderItem[];
  scannedQuantities: Record<string, number>;
  checkedItems: Record<string, boolean>;
  activeItemId: string | null;
  onScanUnit: (itemId: string) => void;
  onClose: () => void;
  onSelectActiveItem: (itemId: string) => void;
}

export const InlineSkuScanner: React.FC<InlineSkuScannerProps> = ({
  items,
  scannedQuantities,
  checkedItems,
  activeItemId,
  onScanUnit,
  onClose,
  onSelectActiveItem,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<{
    text: string;
    isComplete: boolean;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Active target item
  const currentItem = items.find((it) => it.id === activeItemId) || items[0];
  const targetSku = currentItem ? getEffectiveSku(currentItem) : '';
  const currentTotal = currentItem?.quantity || 1;
  const currentScanned = currentItem ? scannedQuantities[currentItem.id] || 0 : 0;
  const currentRemaining = Math.max(0, currentTotal - currentScanned);
  const isCurrentlyPacked = Boolean(currentItem && checkedItems[currentItem.id]) || currentScanned >= currentTotal;

  // Sound feedback using Web Audio API
  const playAudio = useCallback((type: 'beep' | 'complete') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'beep') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } else {
        const playTone = (freq: number, start: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
          gain.gain.setValueAtTime(0.22, ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + start);
          osc.stop(ctx.currentTime + start + dur);
        };
        playTone(659.25, 0, 0.14);
        playTone(880.0, 0.12, 0.28);
      }
    } catch {
      // Audio fallback silent
    }
  }, [soundEnabled]);

  // Execute unit scan and handle packing & remaining countdown
  const handleExecuteScan = useCallback(
    (itemToScan?: OrderItem) => {
      const target = itemToScan || currentItem;
      if (!target) return;

      const total = target.quantity || 1;
      const currentCount = scannedQuantities[target.id] || 0;
      const nextCount = currentCount + 1;
      const remainingAfter = Math.max(0, total - nextCount);

      onScanUnit(target.id);

      if (nextCount >= total) {
        playAudio('complete');
        setLastScannedFeedback({
          text: `Total fulfillment reached for ${target.product_name}! Marked as packed.`,
          isComplete: true,
        });

        // Automatically switch to next unpacked product after short delay
        const nextUnfulfilled = items.find(
          (it) =>
            it.id !== target.id &&
            !checkedItems[it.id] &&
            (scannedQuantities[it.id] || 0) < (it.quantity || 1)
        );
        if (nextUnfulfilled) {
          setTimeout(() => {
            onSelectActiveItem(nextUnfulfilled.id);
            setLastScannedFeedback(null);
          }, 1200);
        }
      } else {
        playAudio('beep');
        setLastScannedFeedback({
          text: `1 unit scanned • ${remainingAfter} left to pack.`,
          isComplete: false,
        });
      }
    },
    [currentItem, scannedQuantities, onScanUnit, playAudio, items, checkedItems, onSelectActiveItem]
  );

  // Request & Start Camera immediately
  const startCamera = useCallback(async () => {
    setPermissionState('requesting');
    setErrorMessage(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser.');
      }

      // Try environment/back camera first, fallback to user/default
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }

      setPermissionState('granted');
      setIsScanningActive(true);
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      console.warn('Camera request error:', error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser to scan barcodes.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setPermissionState('denied');
        setErrorMessage('No camera device found on this system.');
      } else {
        setPermissionState('denied');
        setErrorMessage(error.message || 'Unable to start camera.');
      }
    }
  }, []);

  // On mount: open camera immediately and ask for permission
  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [startCamera]);

  // Real-time Barcode Detection loop (if supported natively by browser)
  useEffect(() => {
    if (permissionState !== 'granted' || !isScanningActive) return;

    let isRunning = true;

    // Check if BarcodeDetector API is present in browser
    const BarcodeDetectorClass = (window as unknown as { BarcodeDetector?: any }).BarcodeDetector;

    if (BarcodeDetectorClass) {
      try {
        const barcodeDetector = new BarcodeDetectorClass({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
        });

        const detectLoop = async () => {
          if (!isRunning) return;

          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detectedVal = barcodes[0].rawValue;
                const now = Date.now();
                // Throttle 1.5 seconds between detections
                if (detectedVal && (detectedVal !== lastDetectedCodeRef.current || now - lastScanTimeRef.current > 1500)) {
                  lastDetectedCodeRef.current = detectedVal;
                  lastScanTimeRef.current = now;
                  handleExecuteScan();
                }
              }
            } catch {
              // Ignore frame detection hiccups
            }
          }

          if (isRunning) {
            animationFrameRef.current = requestAnimationFrame(detectLoop);
          }
        };

        detectLoop();
      } catch {
        // Fallback gracefully
      }
    }

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [permissionState, isScanningActive, handleExecuteScan]);

  return (
    <div
      id="sku-camera-scanner-view"
      className="relative overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-2xl transition-all"
    >
      {/* Top Floating Header with target SKU and Controls */}
      <div className="absolute top-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
            <Camera className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono-code text-xs font-bold px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-amber-300">
                {targetSku}
              </span>
              <span className="text-[11px] font-semibold text-white/90 truncate max-w-[160px] sm:max-w-xs">
                {currentItem?.product_name}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`font-mono-code text-[11px] font-bold px-2 py-0.2 rounded-full border ${
                  isCurrentlyPacked
                    ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500'
                    : 'text-amber-300 bg-amber-950/80 border-amber-500'
                }`}
              >
                {isCurrentlyPacked ? 'Packed (100%)' : `${currentRemaining} remaining (${currentScanned}/${currentTotal})`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white/80 hover:text-white transition cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 hover:bg-rose-900/60 border border-white/20 hover:border-rose-500 text-white/80 hover:text-rose-200 transition cursor-pointer"
            title="Close camera scanner"
            aria-label="Close Camera"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Camera Viewport Area */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] min-h-[300px] max-h-[460px] bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Video feed element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            permissionState === 'granted' ? 'opacity-100' : 'opacity-20'
          }`}
        />

        {/* State 1: Requesting Permission / Initializing */}
        {permissionState === 'requesting' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-black/75 backdrop-blur-xs">
            <div className="w-12 h-12 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">Starting SKU Camera...</h3>
            <p className="text-xs text-slate-300 max-w-xs">
              Please click "Allow" when browser prompts for camera permission.
            </p>
          </div>
        )}

        {/* State 2: Permission Denied or Not Available */}
        {permissionState === 'denied' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-black/85 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Camera Permission Required</h3>
            <p className="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">
              {errorMessage || 'Camera access was not granted. Please allow camera permissions to scan SKUs.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Grant / Retry Camera</span>
              </button>
              <button
                type="button"
                onClick={() => handleExecuteScan()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Manual 1-Tap Scan</span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: Camera Granted - Active Viewfinder Overlay */}
        {permissionState === 'granted' && (
          <>
            {/* Viewfinder Target Reticle with Corner Accents */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
              <div className="relative w-64 sm:w-80 h-44 sm:h-52 rounded-xl border border-white/20">
                {/* 4 Glowing Corner Brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br" />

                {/* Animated Horizontal Laser Scanline */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-pulse top-1/2 -translate-y-1/2" />

                {/* Target SKU center tag */}
                <div className="absolute -bottom-8 inset-x-0 flex justify-center">
                  <span className="font-mono-code text-[11px] bg-black/80 text-amber-300 px-3 py-0.5 rounded-full border border-amber-400/40 shadow-sm backdrop-blur-xs">
                    Target: {targetSku}
                  </span>
                </div>
              </div>
            </div>

            {/* Instant Scan / Decrement Trigger Button over Camera */}
            <div className="absolute bottom-4 inset-x-0 z-30 flex flex-col items-center justify-center gap-2 px-4">
              {/* Feedback toast if scanned */}
              {lastScannedFeedback && (
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border shadow-lg flex items-center gap-1.5 transition animate-in fade-in zoom-in-95 duration-200 ${
                    lastScannedFeedback.isComplete
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                      : 'bg-amber-950/90 border-amber-400 text-amber-200'
                  }`}
                >
                  {lastScannedFeedback.isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{lastScannedFeedback.text}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleExecuteScan()}
                  disabled={currentRemaining === 0}
                  className={`px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl backdrop-blur-md transition active:scale-[0.96] cursor-pointer ${
                    currentRemaining === 0
                      ? 'bg-emerald-600 text-white border border-emerald-400 cursor-default'
                      : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 border border-amber-300 shadow-[0_4px_14px_rgba(245,158,11,0.5)]'
                  }`}
                  title="Scan 1 unit now"
                >
                  {currentRemaining === 0 ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Product 100% Packed</span>
                    </>
                  ) : (
                    <>
                      <ScanBarcode className="w-4 h-4" />
                      <span>Scan 1 Unit ({currentRemaining} left)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Switcher: if order has multiple products, quickly switch target without extra popups */}
      {items.length > 1 && (
        <div className="p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-mono-code font-bold text-slate-400 shrink-0">
            Products:
          </span>
          {items.map((it) => {
            const sku = getEffectiveSku(it);
            const total = it.quantity || 1;
            const scanned = scannedQuantities[it.id] || 0;
            const rem = Math.max(0, total - scanned);
            const isDone = Boolean(checkedItems[it.id]) || scanned >= total;
            const isSelected = it.id === (currentItem?.id || activeItemId);

            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onSelectActiveItem(it.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-code transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-xs'
                    : isDone
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isDone ? <Check className="w-3 h-3 text-emerald-400" /> : <ScanBarcode className="w-3 h-3" />}
                <span className="truncate max-w-[100px]">{it.product_name}</span>
                <span className="text-[10px] opacity-80">({rem === 0 ? 'Packed' : `${rem} left`})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
