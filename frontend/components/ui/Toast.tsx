import { X, Check, AlertTriangle, Loader2, Info } from 'lucide-react';
import { useToast, type ToastVariant } from '../../contexts/ToastContext';

/* ------------------------------------------------------------------ */
/*  Variant config                                                     */
/* ------------------------------------------------------------------ */

const VARIANT_CONFIG: Record<ToastVariant, { border: string; color: string; Icon: typeof Check }> = {
  success: { border: '#34D399', color: '#34D399', Icon: Check },
  error: { border: '#EF4444', color: '#EF4444', Icon: AlertTriangle },
  updating: { border: '#D4AF37', color: '#D4AF37', Icon: Loader2 },
  info: { border: 'rgba(212,175,55,0.4)', color: '#9CA3AF', Icon: Info },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-[100] flex flex-col items-end"
      style={{ bottom: '24px', right: '24px', gap: '10px', pointerEvents: 'none' }}
    >
      {toasts.map((toast) => {
        const cfg = VARIANT_CONFIG[toast.variant];
        return (
          <div
            key={toast.id}
            className={`transition-all duration-300 ${toast.exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
            style={{
              pointerEvents: 'auto',
              minWidth: '280px',
              maxWidth: '400px',
              borderRadius: '10px',
              border: `1px solid ${cfg.border}`,
              backgroundColor: '#0a0a00',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}
          >
            <div className="flex items-center justify-between" style={{ padding: '10px 12px' }}>
              <div className="flex items-center" style={{ gap: '8px' }}>
                <cfg.Icon
                  size={14}
                  className={`flex-shrink-0 ${toast.variant === 'updating' ? 'animate-spin' : ''}`}
                  style={{ color: cfg.color }}
                />
                <span
                  className="text-[13px] font-medium"
                  style={{ color: cfg.color }}
                >
                  {toast.message}
                </span>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="flex items-center justify-center rounded text-gray-500 hover:text-white transition-colors flex-shrink-0"
                style={{ width: '20px', height: '20px', marginLeft: '8px' }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
