import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, X, Shield } from 'lucide-react';

export type OperationResult = {
  type: 'success' | 'error';
  message: string;
};

interface OperationOverlayProps {
  /** Whether the operation is actively running */
  isActive: boolean;
  /** Progress percentage (0-100). If null, shows indeterminate animation */
  progress: number | null;
  /** Status text shown below the progress bar */
  statusText: string;
  /** The final result — when set, the progress UI is replaced with a result popup */
  result: OperationResult | null;
  /** Called when the user dismisses the result popup */
  onDismiss: () => void;
  /** Optional secondary action label (e.g. "Alternar Grimório") */
  secondaryActionLabel?: string;
  /** Triggered when the user clicks the secondary action button */
  onSecondaryAction?: () => void;
}

/**
 * Full-screen glassmorphism overlay for long-running backup/restore operations.
 * 
 * Lifecycle:
 * 1. `isActive=true` with `result=null` → shows progress bar + status
 * 2. `result` is set → shows success/error popup with dismiss button
 * 3. User clicks dismiss → `onDismiss()` is called → parent hides overlay
 */
export const OperationOverlay: React.FC<OperationOverlayProps> = ({
  isActive,
  progress,
  statusText,
  result,
  onDismiss,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  const [visible, setVisible] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  // Show overlay when active or result is present
  const shouldShow = isActive || result !== null;

  useEffect(() => {
    if (shouldShow) {
      setAnimateOut(false);
      // Small delay for mount animation
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [shouldShow]);

  const handleDismiss = () => {
    setAnimateOut(true);
    setTimeout(() => {
      setAnimateOut(false);
      onDismiss();
    }, 300);
  };

  // Auto-dismiss success after 4 seconds only if there's no secondary action to block it
  useEffect(() => {
    if (result?.type === 'success' && !onSecondaryAction) {
      const timer = setTimeout(handleDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [result, onSecondaryAction]);

  if (!shouldShow && !animateOut) return null;

  const isInProgress = isActive && !result;
  const progressValue = progress ?? 0;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        visible && !animateOut ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(15, 15, 18, 0.75)',
      }}
    >
      {/* Content Card */}
      <div
        className={`relative w-full max-w-md transition-all duration-500 ease-out ${
          visible && !animateOut
            ? 'scale-100 translate-y-0 opacity-100'
            : 'scale-95 translate-y-4 opacity-0'
        }`}
        style={{
          background: 'linear-gradient(145deg, rgba(30,30,36,0.95) 0%, rgba(15,15,18,0.98) 100%)',
          border: '1px solid rgba(197, 168, 128, 0.25)',
          borderRadius: '1rem',
          boxShadow: '0 0 60px rgba(197, 168, 128, 0.12), 0 25px 50px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Decorative top edge */}
        <div
          className="absolute top-0 left-4 right-4 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(197,168,128,0.6), transparent)',
          }}
        />

        {/* ── In-progress state ── */}
        {isInProgress && (
          <div className="p-8 space-y-6 text-center">
            {/* Animated shield icon */}
            <div className="flex justify-center">
              <div className="relative">
                <Shield className="w-14 h-14 text-medieval-gold" style={{ animation: 'overlayPulse 2s ease-in-out infinite' }} />
                <RefreshCw
                  className="w-6 h-6 text-medieval-brightGold absolute -bottom-1 -right-1"
                  style={{ animation: 'overlaySpin 1.5s linear infinite' }}
                />
              </div>
            </div>

            {/* Status text */}
            <div>
              <p className="font-medieval text-medieval-gold text-sm tracking-wider uppercase">
                Operação em Andamento
              </p>
              <p className="text-medieval-silver text-xs mt-2 font-serif min-h-[2em]" style={{ animation: 'overlayTextFade 2s ease-in-out infinite' }}>
                {statusText || 'Preparando...'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div
                className="w-full h-2.5 rounded-full overflow-hidden"
                style={{
                  background: 'rgba(15,15,18,0.8)',
                  border: '1px solid rgba(197,168,128,0.15)',
                }}
              >
                {progress !== null ? (
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${progressValue}%`,
                      background: 'linear-gradient(90deg, #8b6914, #c5a880, #e5cda8)',
                      boxShadow: '0 0 12px rgba(197,168,128,0.5)',
                    }}
                  />
                ) : (
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '40%',
                      background: 'linear-gradient(90deg, #8b6914, #c5a880, #e5cda8)',
                      boxShadow: '0 0 12px rgba(197,168,128,0.5)',
                      animation: 'overlayIndeterminate 1.5s ease-in-out infinite',
                    }}
                  />
                )}
              </div>
              {progress !== null && (
                <span className="text-medieval-brightGold text-xs font-medieval tracking-wider">
                  {progressValue}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Result state ── */}
        {result && (
          <div className="p-8 space-y-5 text-center">
            {/* Dismiss X button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-medieval-stone/50 text-medieval-silver hover:text-medieval-parchment transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Result Icon */}
            <div className="flex justify-center">
              {result.type === 'success' ? (
                <div
                  className="p-3 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
                    animation: 'overlayPopIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                  }}
                >
                  <CheckCircle className="w-14 h-14 text-green-400 drop-shadow-lg" />
                </div>
              ) : (
                <div
                  className="p-3 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
                    animation: 'overlayPopIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                  }}
                >
                  <XCircle className="w-14 h-14 text-red-400 drop-shadow-lg" />
                </div>
              )}
            </div>

            {/* Result title */}
            <p
              className={`font-medieval text-base tracking-wider uppercase ${
                result.type === 'success' ? 'text-green-300' : 'text-red-300'
              }`}
            >
              {result.type === 'success' ? 'Operação Concluída!' : 'Falha na Operação'}
            </p>

            {/* Result message */}
            <p className="text-medieval-parchment text-xs font-serif leading-relaxed px-2">
              {result.message}
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              {result.type === 'success' && onSecondaryAction && secondaryActionLabel && (
                <button
                  onClick={() => {
                    onSecondaryAction();
                    handleDismiss();
                  }}
                  className="flex-1 py-2.5 rounded font-medieval font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer bg-medieval-gold/20 border border-medieval-gold/40 text-medieval-brightGold hover:bg-medieval-gold/40 hover:border-medieval-brightGold"
                >
                  {secondaryActionLabel}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className={`flex-1 py-2.5 rounded font-medieval font-bold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                  result.type === 'success'
                    ? 'bg-green-905/30 border border-green-800/40 text-green-300 hover:bg-green-900/50 hover:border-green-600/50'
                    : 'bg-red-905/30 border border-red-800/40 text-red-300 hover:bg-red-900/50 hover:border-red-600/50'
                }`}
              >
                {result.type === 'success' ? 'Continuar' : 'Entendido'}
              </button>
            </div>

            {/* Auto-dismiss countdown for success */}
            {result.type === 'success' && (
              <div className="w-full h-0.5 rounded-full overflow-hidden bg-medieval-stone/50">
                <div
                  className="h-full bg-green-500/50 rounded-full"
                  style={{ animation: 'overlayShrink 4s linear forwards' }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Keyframe Animations (injected once) ── */}
      <style>{`
        @keyframes overlayPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes overlaySpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes overlayTextFade {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes overlayIndeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes overlayPopIn {
          0% { transform: scale(0.3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes overlayShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};
