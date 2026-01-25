import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useToastStore } from '../stores/useToastStore';

const variantClasses: Record<string, string> = {
  info: 'border-[#eaeaea] bg-white text-black',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
};

const ToastHost: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (typeof document === 'undefined' || toasts.length === 0) return null;

  return createPortal(
    <div className="fixed right-4 top-4 z-[1000] flex w-[360px] max-w-[calc(100vw-32px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.10)] ${variantClasses[t.variant] ?? variantClasses.info}`}
          role="status"
          aria-live="polite"
        >
          <div className="text-[13px] font-medium leading-relaxed">{t.message}</div>
          <button
            type="button"
            className="rounded-md p-1 text-slate-400 hover:bg-black/5 hover:text-black"
            onClick={() => dismissToast(t.id)}
            aria-label="关闭提示"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
};

export default ToastHost;

