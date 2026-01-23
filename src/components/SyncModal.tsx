import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CheckCircle2, ChevronRight, Loader2, RefreshCw, XCircle } from 'lucide-react';

import { useUIStore } from '../stores/useUIStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useAgentStore } from '../stores/useAgentStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { syncAllToManagerStoreWithProgress } from '../services/tauriClient';

interface SyncLog {
  id: string;
  label: string;
  status: 'loading' | 'success' | 'error';
}

const SyncModal: React.FC = () => {
  const isSyncModalOpen = useUIStore((state) => state.isSyncModalOpen);
  const setSyncModalOpen = useUIStore((state) => state.setSyncModalOpen);

  const storagePath = useSettingsStore((state) => state.storagePath);
  const agents = useAgentStore(useShallow((state) => state.agents));

  const mergeSkills = useSkillStore((state) => state.mergeSkills);
  const addLog = useSkillStore((state) => state.addLog);

  const [progress, setProgress] = useState(0);
  const [activeLogs, setActiveLogs] = useState<SyncLog[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (isSyncModalOpen) {
      const runId = ++runIdRef.current;
      void startSync(runId);
      return;
    }

    runIdRef.current++;
    setProgress(0);
    setActiveLogs([]);
    setIsFinished(false);
    setHasError(false);
  }, [isSyncModalOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeLogs]);

  const startSync = async (runId: number) => {
    setProgress(0);
    setActiveLogs([]);
    setIsFinished(false);
    setHasError(false);

    try {
      const synced = await syncAllToManagerStoreWithProgress(agents, (log) => {
        if (runId !== runIdRef.current) return;

        setProgress(Math.max(0, Math.min(100, log.progress)));
        setActiveLogs((prev) => {
          const exists = prev.some((l) => l.id === log.id);
          if (!exists) return [...prev, { id: log.id, label: log.label, status: log.status }];
          return prev.map((l) =>
            l.id === log.id ? { ...l, label: log.label, status: log.status } : l,
          );
        });
      });

      if (runId !== runIdRef.current) return;

      mergeSkills(synced);
      setIsFinished(true);
      addLog({
        action: 'sync',
        skillId: '全量同步',
        status: 'success',
        message: `同步完成：已识别 ${synced.length} 个技能目录`,
      });
    } catch (e) {
      if (runId !== runIdRef.current) return;

      console.error(e);
      setHasError(true);
      setIsFinished(true);
      const message = `同步失败: ${e instanceof Error ? e.message : '未知错误'}`;
      setActiveLogs((prev) => {
        const exists = prev.some((l) => l.id === 'error');
        if (!exists) return [...prev, { id: 'error', label: message, status: 'error' }];
        return prev.map((l) => (l.id === 'error' ? { ...l, label: message, status: 'error' } : l));
      });
      addLog({
        action: 'sync',
        skillId: '全量同步',
        status: 'error',
        message,
      });
    }
  };

  if (!isSyncModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md animate-in fade-in duration-300" />

      <div className="relative w-full max-w-md bg-white vercel-border rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-[#eaeaea] bg-[#fafafa]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-black text-white shrink-0">
              <RefreshCw size={20} className={!isFinished ? 'animate-spin' : ''} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-black tracking-tight">资产汇总同步</h3>
              <p className="text-[12px] text-slate-500 font-medium">
                中心库路径: <span className="mono text-black">{storagePath}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="h-1.5 bg-slate-100 w-full relative">
          <div
            className={`h-full transition-all duration-700 ease-in-out ${hasError ? 'bg-red-500' : 'bg-black'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          ref={scrollRef}
          className="p-8 h-[200px] overflow-y-auto scroll-smooth flex flex-col gap-4 scrollbar-hide relative"
        >
          {activeLogs.slice(-4).map((log, index, array) => {
            const isLast = index === array.length - 1;
            const isSecondLast = index === array.length - 2;

            return (
              <div
                key={log.id}
                className={`flex items-center gap-3 transition-all duration-500 ease-out
                  ${isLast ? 'opacity-100 translate-y-0' : isSecondLast ? 'opacity-40 -translate-y-1' : 'opacity-10 -translate-y-2 scale-95'}
                `}
              >
                <div className="shrink-0">
                  {log.status === 'success' ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : log.status === 'error' ? (
                    <XCircle size={16} className="text-red-500" />
                  ) : (
                    <Loader2 size={16} className="text-black animate-spin" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isLast && <ChevronRight size={12} className="text-slate-300" />}
                  <span
                    className={`text-[13px] tracking-tight ${isLast ? 'text-black font-bold' : 'text-slate-500 font-medium'}`}
                  >
                    {log.label}
                  </span>
                </div>
              </div>
            );
          })}

          {activeLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 animate-pulse">
              <RefreshCw size={24} className="mb-2" />
              <span className="text-[12px] font-medium">准备同步任务...</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#fafafa] border-t border-[#eaeaea] flex justify-between items-center px-6">
          <div className="text-[12px] text-slate-400 font-bold mono">
            {hasError ? 'SYNC_FAILED' : isFinished ? 'SYNC_COMPLETE' : `SYNCING_READY_${Math.round(progress)}%`}
          </div>
          <button
            onClick={() => setSyncModalOpen(false)}
            disabled={!isFinished}
            className={`
              px-6 py-2 rounded-lg text-[13px] font-bold transition-all
              ${isFinished
                ? 'bg-black text-white hover:bg-slate-800 shadow-lg shadow-black/5 active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
            `}
          >
            {isFinished ? '完成' : '请稍候...'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
