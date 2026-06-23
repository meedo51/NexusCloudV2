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
      const qrSize = 220;
      const padding = 18;
      const totalSize = qrSize + padding * 2;
      const dpr = devicePixelRatio || 1;

      canvas.width = totalSize * dpr;
      canvas.height = totalSize * dpr;
      canvas.style.width = `${totalSize}px`;
      canvas.style.height = `${totalSize}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      // White rounded background card for the QR code
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(0, 0, totalSize, totalSize, 14);
      ctx.fill();

      // Thin shadow border
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(0.5, 0.5, totalSize - 1, totalSize - 1, 14);
      ctx.stroke();

      // Render QR code to temp canvas and draw onto our DPI-aware canvas
      const tempCanvas = document.createElement('canvas');
      await QRCode.toCanvas(tempCanvas, url, {
        width: qrSize,
        margin: 0,
        color: { dark: '#1A1A2E', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      });
      ctx.drawImage(tempCanvas, padding, padding, qrSize, qrSize);

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

              {/* Scan line on the border frame */}
              <div className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden">
                <motion.div
                  animate={{ top: ['-2%', '102%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 0.5 }}
                  className="absolute left-[2%] right-[2%] h-[1px] opacity-40"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.5), rgba(167,139,250,0.5), transparent)',
                  }}
                />
              </div>

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

                {/* QR Code */}
                <div className="relative flex justify-center mb-4">
                  {/* Decorative rotating ring behind QR */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                      className="w-[290px] h-[290px] rounded-full"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent, rgba(0,240,255,0.06), rgba(167,139,250,0.06), transparent)',
                      }}
                    />
                  </div>

                  {/* QR container */}
                  <div className="relative z-10">
                    {/* Corner accent - top-left */}
                    <div className="absolute -top-1 -left-1 z-20 w-7 h-7 border-t-2 border-l-2 border-cyan/50 rounded-tl-xl" />
                    {/* Corner accent - top-right */}
                    <div className="absolute -top-1 -right-1 z-20 w-7 h-7 border-t-2 border-r-2 border-purple/50 rounded-tr-xl" />
                    {/* Corner accent - bottom-left */}
                    <div className="absolute -bottom-1 -left-1 z-20 w-7 h-7 border-b-2 border-l-2 border-purple/50 rounded-bl-xl" />
                    {/* Corner accent - bottom-right */}
                    <div className="absolute -bottom-1 -right-1 z-20 w-7 h-7 border-b-2 border-r-2 border-cyan/50 rounded-br-xl" />

                    {/* Subtle glow behind QR */}
                    <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-cyan/5 via-transparent to-purple/5 blur-xl" />

                    <canvas
                      ref={canvasRef}
                      className={`relative rounded-xl transition-opacity duration-500 ${qrReady ? 'opacity-100' : 'opacity-0'}`}
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
