import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiDownload, FiCopy, FiCheck, FiShare2, FiClock, FiLock, FiEye } from 'react-icons/fi';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  subtitle?: string;
  type: 'share' | 'upload';
  meta?: {
    expiresAt?: string;
    passwordProtected?: boolean;
    downloads?: number;
    permission?: string;
  };
}

const CYAN = '#00F0FF';
const PURPLE = '#A78BFA';
const DARK = '#0B0E14';

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * 3,
    delay: Math.random() * 3,
    duration: 3 + Math.random() * 4,
    opacity: 0.15 + Math.random() * 0.35,
  }));
}

export default function QRCodeModal({ isOpen, onClose, url, title, subtitle, type, meta }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [particles] = useState(() => generateParticles(20));

  const generateQR = useCallback(async () => {
    if (!canvasRef.current || !url) return;
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 260;
      const margin = 16;
      const totalSize = size + margin * 2;

      canvas.width = totalSize * devicePixelRatio;
      canvas.height = totalSize * devicePixelRatio;
      canvas.style.width = `${totalSize}px`;
      canvas.style.height = `${totalSize}px`;
      ctx.scale(devicePixelRatio, devicePixelRatio);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = size;
      tempCanvas.height = size;
      await QRCode.toCanvas(tempCanvas, url, {
        width: size,
        margin: 0,
        color: { dark: '#000', light: '#00000000' },
        errorCorrectionLevel: 'H',
      });

      const srcCtx = tempCanvas.getContext('2d');
      if (!srcCtx) return;
      const imageData = srcCtx.getImageData(0, 0, size, size);
      const data = imageData.data;

      ctx.clearRect(0, 0, totalSize, totalSize);

      // Background
      ctx.fillStyle = 'transparent';

      // Find QR module size
      let moduleSize = 0;
      for (let x = 0; x < size; x++) {
        const idx = (Math.floor(size / 2) * size + x) * 4;
        if (data[idx + 3] > 128) { moduleSize = x; break; }
      }
      // Find actual module size by scanning first row
      let firstModule = 0;
      for (let x = 0; x < size; x++) {
        if (data[(Math.floor(size / 2) * size + x) * 4 + 3] > 128) {
          firstModule = x;
          break;
        }
      }
      // Count modules (QR is always odd: 21, 25, 29, 33, 37, 41, etc)
      const qrModules = [21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65, 69, 73, 77, 81, 85, 89, 93, 97, 101, 105, 109, 113, 117, 121, 125, 129, 133, 137, 141, 145, 149, 153, 157, 161, 165, 169, 173, 177];
      let modules = 33; // default guess
      for (const m of qrModules) {
        if (size % m === 0) { modules = m; break; }
      }
      const cellSize = size / modules;

      // Draw rounded-corner modules
      const radius = cellSize * 0.35;
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, CYAN);
      gradient.addColorStop(0.5, '#6366F1');
      gradient.addColorStop(1, PURPLE);

      for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
          const px = Math.floor(col * cellSize + cellSize / 2);
          const py = Math.floor(row * cellSize + cellSize / 2);
          const idx = (py * size + px) * 4;
          if (data[idx + 3] > 128) {
            const x = margin + col * cellSize;
            const y = margin + row * cellSize;
            const s = cellSize * 0.92;

            // Glow
            ctx.shadowColor = CYAN;
            ctx.shadowBlur = cellSize * 0.3;

            ctx.beginPath();
            ctx.roundRect(x + (cellSize - s) / 2, y + (cellSize - s) / 2, s, s, radius);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Inner highlight
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.roundRect(x + (cellSize - s * 0.6) / 2, y + (cellSize - s * 0.6) / 2, s * 0.6, s * 0.6, radius * 0.5);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fill();
          }
        }
      }

      ctx.shadowBlur = 0;

      // Finder patterns (the three large squares) - enhanced
      const finderPositions = [
        { row: 0, col: 0 },
        { row: 0, col: modules - 7 },
        { row: modules - 7, col: 0 },
      ];

      for (const fp of finderPositions) {
        const fx = margin + fp.col * cellSize;
        const fy = margin + fp.row * cellSize;
        const fSize = 7 * cellSize;

        // Outer glow
        ctx.shadowColor = 'rgba(0, 240, 255, 0.3)';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = cellSize * 0.4;
        ctx.beginPath();
        ctx.roundRect(fx + cellSize * 0.3, fy + cellSize * 0.3, fSize - cellSize * 0.6, fSize - cellSize * 0.6, cellSize);
        ctx.stroke();

        // Outer square
        ctx.shadowBlur = 0;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(fx + cellSize * 0.3, fy + cellSize * 0.3, fSize - cellSize * 0.6, fSize - cellSize * 0.6, cellSize);
        ctx.fill();

        // Inner white
        ctx.fillStyle = DARK;
        ctx.beginPath();
        ctx.roundRect(fx + cellSize * 1.3, fy + cellSize * 1.3, fSize - cellSize * 2.6, fSize - cellSize * 2.6, cellSize * 0.6);
        ctx.fill();

        // Center module
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 15;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(fx + cellSize * 2.5, fy + cellSize * 2.5, cellSize * 2, cellSize * 2, cellSize * 0.5);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      setQrReady(true);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  }, [url]);

  useEffect(() => {
    if (isOpen) {
      setQrReady(false);
      const timer = setTimeout(() => generateQR(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, generateQR]);

  const downloadQR = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `nexuscloud-qr-${type}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('QR code downloaded');
  }, [type]);

  const copyUrl = useCallback(() => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error('Failed to copy'));
  }, [url]);

  const shortUrl = url.length > 50 ? url.substring(0, 45) + '...' : url;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Animated gradient orbs background */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-cyan/10 to-transparent blur-3xl"
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], rotate: [0, -30, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-purple/10 to-transparent blur-3xl"
            />
          </div>

          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-sm"
          >
            {/* Floating particles */}
            {particles.map(p => (
              <motion.div
                key={p.id}
                className="absolute w-1 h-1 rounded-full bg-cyan/30"
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
                animate={{
                  y: [0, -15, 0],
                  opacity: [p.opacity, p.opacity * 2, p.opacity],
                }}
                transition={{
                  duration: p.duration,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}

            {/* Main card */}
            <div className="relative rounded-3xl border border-white/10 overflow-hidden backdrop-blur-2xl bg-[#0B0E14]/90">
              {/* Animated gradient border */}
              <motion.div
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-3xl opacity-20"
                style={{
                  background: 'linear-gradient(135deg, #00F0FF, #6366F1, #A78BFA, #00F0FF)',
                  backgroundSize: '200% 200%',
                  padding: '1px',
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  maskComposite: 'exclude',
                  WebkitMaskComposite: 'xor',
                }}
              />

              {/* Inner content */}
              <div className="relative p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-cyan/20 to-purple/20">
                      <FiShare2 className="text-cyan" size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Share via QR</h3>
                      <p className="text-[11px] text-white/40">{type === 'share' ? 'File share link' : 'Upload request link'}</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors">
                    <FiX size={18} />
                  </button>
                </div>

                {/* Title info */}
                <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <p className="text-sm font-medium text-white/80 truncate">{title}</p>
                  {subtitle && <p className="text-xs text-white/40 mt-0.5 truncate">{subtitle}</p>}
                </div>

                {/* QR Code canvas with artistic frame */}
                <div className="relative flex justify-center mb-4">
                  {/* Outer decorative ring */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="w-[300px] h-[300px] rounded-full"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent, rgba(0,240,255,0.08), rgba(167,139,250,0.08), transparent)',
                      }}
                    />
                  </div>

                  {/* QR container with glow */}
                  <div className="relative z-10 p-3.5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/[0.06]">
                    {/* Scan line animation */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                      <motion.div
                        animate={{ top: ['-10%', '110%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1 }}
                        className="absolute left-[5%] right-[5%] h-[2px]"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.6), rgba(167,139,250,0.6), transparent)',
                          boxShadow: '0 0 12px rgba(0,240,255,0.3)',
                        }}
                      />
                    </div>

                    {/* Corner accents */}
                    <div className="absolute -top-[2px] -left-[2px] w-8 h-8 border-t-2 border-l-2 border-cyan/40 rounded-tl-xl" />
                    <div className="absolute -top-[2px] -right-[2px] w-8 h-8 border-t-2 border-r-2 border-purple/40 rounded-tr-xl" />
                    <div className="absolute -bottom-[2px] -left-[2px] w-8 h-8 border-b-2 border-l-2 border-purple/40 rounded-bl-xl" />
                    <div className="absolute -bottom-[2px] -right-[2px] w-8 h-8 border-b-2 border-r-2 border-cyan/40 rounded-br-xl" />

                    <canvas
                      ref={canvasRef}
                      className={`transition-opacity duration-500 ${qrReady ? 'opacity-100' : 'opacity-0'}`}
                    />

                    {!qrReady && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                          className="w-8 h-8 border-2 border-cyan/30 border-t-cyan rounded-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* URL display */}
                <div className="mb-4 px-3 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-white/50 truncate flex-1">{shortUrl}</span>
                    <button
                      onClick={copyUrl}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-cyan transition-colors flex-shrink-0"
                    >
                      {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Meta info */}
                {meta && (
                  <div className="flex items-center justify-center gap-4 mb-4 text-[11px] text-white/40">
                    {meta.expiresAt && (
                      <span className="flex items-center gap-1">
                        <FiClock size={11} /> Expires {new Date(meta.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    {meta.passwordProtected && (
                      <span className="flex items-center gap-1 text-amber-400/60">
                        <FiLock size={11} /> Protected
                      </span>
                    )}
                    {meta.permission && (
                      <span className="flex items-center gap-1">
                        <FiEye size={11} /> {meta.permission}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2.5">
                  <button
                    onClick={downloadQR}
                    disabled={!qrReady}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gradient-to-r from-cyan/20 to-purple/20 hover:from-cyan/30 hover:to-purple/30 text-white/80 text-sm font-medium transition-all disabled:opacity-30"
                  >
                    <FiDownload size={15} />
                    Download
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] text-white/50 text-sm transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
