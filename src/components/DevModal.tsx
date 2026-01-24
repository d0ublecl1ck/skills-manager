import React, { useEffect } from 'react';
import { Construction, X } from 'lucide-react';

import { useUIStore } from '../stores/useUIStore';

const DevModal: React.FC = () => {
  const { isDevModalOpen, setDevModalOpen } = useUIStore();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDevModalOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setDevModalOpen]);

  if (!isDevModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-white/60 backdrop-blur-sm"
        onClick={() => setDevModalOpen(false)}
      />

      <div className="relative w-full max-w-[380px] bg-white vercel-border rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 duration-200 text-center">
        <div className="flex justify-end p-4 absolute right-0 top-0">
          <button
            onClick={() => setDevModalOpen(false)}
            className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-black"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-10 space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#fafafa] vercel-border rounded-2xl flex items-center justify-center text-black shadow-sm">
              <Construction size={32} className="text-slate-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[18px] font-bold text-black tracking-tight">正在开发中</h3>
            <p className="text-[14px] text-slate-500 leading-relaxed">
              此项功能正在进行最后的调试与本地兼容性优化，敬请期待下个版本的发布。
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setDevModalOpen(false)}
              className="w-full py-2.5 bg-black text-white text-[13px] font-bold rounded-lg hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-black/5"
            >
              我知道了
            </button>
          </div>
        </div>

        <div className="py-3 bg-[#fafafa] border-t border-[#eaeaea]">
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mono">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
};

export default DevModal;

