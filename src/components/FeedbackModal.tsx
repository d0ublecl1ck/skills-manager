
import React, { useEffect } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { X, Mail, Github, MessageSquare, Copy, Check } from 'lucide-react';

const FeedbackModal: React.FC = () => {
  const { isFeedbackModalOpen, setFeedbackModalOpen } = useUIStore();
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFeedbackModalOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setFeedbackModalOpen]);

  if (!isFeedbackModalOpen) return null;

  const email = 'd0ublecl1ckhpx@gmail.com';

  const copyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-white/60 backdrop-blur-sm"
        onClick={() => setFeedbackModalOpen(false)}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-[440px] bg-white vercel-border rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-[#eaeaea]">
          <h3 className="text-[16px] font-bold text-black tracking-tight">意见反馈</h3>
          <button 
            onClick={() => setFeedbackModalOpen(false)}
            className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-black"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-[14px] text-slate-500 leading-relaxed">
            感谢您使用 Skills Manager！如果您有任何想法、建议或遇到 Bug，欢迎通过以下渠道与我们联系。
          </p>

          <div className="space-y-3">
            {/* Email Section */}
            <div className="group bg-[#fafafa] vercel-border rounded-xl p-4 flex items-center justify-between transition-all hover:border-black">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white vercel-border rounded-lg flex items-center justify-center shadow-sm">
                  <Mail size={18} className="text-black" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">官方邮箱</div>
                  <div className="text-[14px] font-medium text-black mono">{email}</div>
                </div>
              </div>
              <button 
                onClick={copyEmail}
                className="p-2 hover:bg-white vercel-border rounded-lg transition-all text-slate-400 hover:text-black shadow-none hover:shadow-sm"
                title="复制邮箱地址"
                aria-label="复制邮箱地址"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>

            {/* GitHub Section */}
            <a 
              href="https://github.com/d0ublecl1ck/skills-manager/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group bg-[#fafafa] vercel-border rounded-xl p-4 flex items-center justify-between transition-all hover:border-black hover:bg-white"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white vercel-border rounded-lg flex items-center justify-center shadow-sm">
                  <MessageSquare size={18} className="text-black" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">建议反馈区</div>
                  <div className="text-[14px] font-medium text-black">在 GitHub 提交 Issue</div>
                </div>
              </div>
              <div className="p-2 text-slate-300 group-hover:text-black transition-colors">
                <Github size={18} />
              </div>
            </a>
          </div>
        </div>

        <div className="p-4 bg-[#fafafa] border-t border-[#eaeaea] flex justify-end">
          <button 
            onClick={() => setFeedbackModalOpen(false)}
            className="px-6 py-2 bg-black text-white text-[13px] font-bold rounded-lg hover:bg-slate-800 transition-all"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
