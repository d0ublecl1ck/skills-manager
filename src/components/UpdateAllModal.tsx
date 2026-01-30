import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronRight, Loader2, RefreshCw, XCircle } from 'lucide-react';

import { useUIStore } from '../stores/useUIStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useToastStore } from '../stores/useToastStore';
import type { Skill } from '../types';

interface UpdateLog {
  id: string;
  label: string;
  status: 'loading' | 'success' | 'error';
}

const isSystemInstalledSkill = (skill: Skill) => {
  const installSource =
    skill.installSource ?? (skill.sourceUrl ? ('platform' as const) : ('external' as const));
  return installSource === 'platform' && Boolean(skill.sourceUrl);
};

const UpdateAllModal: React.FC = () => {
  const isOpen = useUIStore((state) => state.isUpdateAllModalOpen);
  const setOpen = useUIStore((state) => state.setUpdateAllModalOpen);

  const reInstallSkill = useSkillStore((state) => state.reInstallSkill);
  const addToast = useToastStore((state) => state.addToast);

  const [progress, setProgress] = useState(0);
  const [activeLogs, setActiveLogs] = useState<UpdateLog[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [targetCount, setTargetCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeLogs]);

  useEffect(() => {
    if (isOpen) {
      const runId = ++runIdRef.current;
      void startUpdateAll(runId);
      return;
    }

    runIdRef.current++;
    setProgress(0);
    setActiveLogs([]);
    setIsFinished(false);
    setHasError(false);
    setTargetCount(0);
  }, [isOpen]);

  const upsertLog = (log: UpdateLog) => {
    setActiveLogs((prev) => {
      const exists = prev.some((l) => l.id === log.id);
      if (!exists) return [...prev, log];
      return prev.map((l) => (l.id === log.id ? { ...l, ...log } : l));
    });
  };

  const startUpdateAll = async (runId: number) => {
    setProgress(0);
    setActiveLogs([]);
    setIsFinished(false);
    setHasError(false);

    const resolveTargets = async () => {
      for (let i = 0; i < 10; i++) {
        const snapshot = useSkillStore.getState().skills.filter(isSystemInstalledSkill);
        if (snapshot.length > 0) return snapshot;
        await new Promise((r) => setTimeout(r, 25));
      }
      return useSkillStore.getState().skills.filter(isSystemInstalledSkill);
    };

    const targets = await resolveTargets();
    if (runId !== runIdRef.current) return;

    setTargetCount(targets.length);

    if (targets.length === 0) {
      upsertLog({ id: 'init', label: '未发现可更新的已安装技能', status: 'success' });
      setProgress(100);
      setIsFinished(true);
      return;
    }

    upsertLog({ id: 'init', label: '正在准备批量更新任务...', status: 'loading' });

    let anyError = false;
    const total = Math.max(1, targets.length);

    for (let idx = 0; idx < targets.length; idx++) {
      const skill = targets[idx]!;
      if (runId !== runIdRef.current) return;

      const id = `update-${skill.id}`;
      upsertLog({ id, label: `正在更新技能: ${skill.name}`, status: 'loading' });
      setProgress(Math.max(0, Math.min(100, (idx / total) * 100)));

      try {
        await reInstallSkill(skill.id);
        if (runId !== runIdRef.current) return;
        upsertLog({ id, label: `正在更新技能: ${skill.name}`, status: 'success' });
      } catch (e) {
        anyError = true;
        if (runId !== runIdRef.current) return;
        upsertLog({
          id,
          label: `更新失败: ${skill.name}（${e instanceof Error ? e.message : '未知错误'}）`,
          status: 'error',
        });
      } finally {
        if (runId !== runIdRef.current) return;
        setProgress(Math.max(0, Math.min(100, ((idx + 1) / total) * 100)));
      }
    }

    if (runId !== runIdRef.current) return;

    upsertLog({
      id: 'done',
      label: anyError ? '批量更新完成（存在失败项）' : '批量更新完成',
      status: anyError ? 'error' : 'success',
    });

    setHasError(anyError);
    setIsFinished(true);

    addToast(anyError ? '更新全库完成，但存在失败项' : '更新全库完成', anyError ? 'error' : 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md animate-in fade-in duration-300" />

      <div className="relative w-full max-w-md bg-white vercel-border rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-[#eaeaea] bg-[#fafafa]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-black text-white shrink-0">
              <RefreshCw size={20} className={!isFinished ? 'animate-spin' : ''} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-black tracking-tight">更新全库</h3>
              <p className="text-[12px] text-slate-500 font-medium">
                目标数量: <span className="mono text-black">{targetCount}</span>
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
              <span className="text-[12px] font-medium">准备更新任务...</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#fafafa] border-t border-[#eaeaea] flex justify-between items-center px-6">
          <div className="text-[12px] text-slate-400 font-bold mono">
            {hasError ? 'UPDATE_FAILED' : isFinished ? 'UPDATE_COMPLETE' : `UPDATING_${Math.round(progress)}%`}
          </div>
          <button
            onClick={() => setOpen(false)}
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

export default UpdateAllModal;
