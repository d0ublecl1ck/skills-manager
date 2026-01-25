import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CheckCheck, CheckCircle2, ChevronRight, Loader2, XCircle } from 'lucide-react';

import { useUIStore } from '../stores/useUIStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useAgentStore } from '../stores/useAgentStore';
import { useToastStore } from '../stores/useToastStore';
import type { AgentId } from '../types';

interface DistributionLog {
  id: string;
  label: string;
  status: 'loading' | 'success' | 'error';
}

const DistributionModal: React.FC = () => {
  const isDistributionModalOpen = useUIStore((state) => state.isDistributionModalOpen);
  const distributionAgentId = useUIStore((state) => state.distributionAgentId);
  const distributionAgentName = useUIStore((state) => state.distributionAgentName);
  const closeDistributionModal = useUIStore((state) => state.closeDistributionModal);

  const agents = useAgentStore(useShallow((state) => state.agents));
  const skills = useSkillStore((state) => state.skills);
  const enableAllSkillsForAgent = useSkillStore((state) => state.enableAllSkillsForAgent);
  const addToast = useToastStore((state) => state.addToast);

  const [progress, setProgress] = useState(0);
  const [activeLogs, setActiveLogs] = useState<DistributionLog[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);

  const pendingCount = useMemo(() => {
    if (!distributionAgentId) return 0;
    return skills.filter((s) => !s.enabledAgents.includes(distributionAgentId)).length;
  }, [skills, distributionAgentId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeLogs]);

  useEffect(() => {
    if (isDistributionModalOpen && distributionAgentId) {
      const runId = ++runIdRef.current;
      void startDistribution(runId, distributionAgentId);
      return;
    }

    runIdRef.current++;
    setProgress(0);
    setActiveLogs([]);
    setIsFinished(false);
    setHasError(false);
  }, [isDistributionModalOpen, distributionAgentId]);

  const startDistribution = async (runId: number, agentId: AgentId) => {
    setProgress(0);
    setActiveLogs([]);
    setIsFinished(false);
    setHasError(false);

    const currentSkills = useSkillStore.getState().skills;
    const needsWork = currentSkills.some((s) => !s.enabledAgents.includes(agentId));
    if (!needsWork) {
      setProgress(100);
      setActiveLogs([{ id: 'noop', label: '无需分发：当前平台已开启全部技能', status: 'success' }]);
      setIsFinished(true);
      addToast(`已为 ${distributionAgentName} 开启库中所有技能`, 'success');
      return;
    }

    try {
      await enableAllSkillsForAgent(agentId, {
        onProgress: (log) => {
          if (runId !== runIdRef.current) return;
          setProgress(Math.max(0, Math.min(100, log.progress)));
          setActiveLogs((prev) => {
            const exists = prev.some((l) => l.id === log.id);
            if (!exists) return [...prev, { id: log.id, label: log.label, status: log.status }];
            return prev.map((l) => (l.id === log.id ? { ...l, label: log.label, status: log.status } : l));
          });
        },
      });

      if (runId !== runIdRef.current) return;

      setIsFinished(true);
      addToast(`已为 ${distributionAgentName} 开启库中所有技能`, 'success');
    } catch (e) {
      if (runId !== runIdRef.current) return;

      console.error(e);
      setHasError(true);
      setIsFinished(true);
      const message = `分发失败: ${e instanceof Error ? e.message : '未知错误'}`;
      setActiveLogs((prev) => {
        const exists = prev.some((l) => l.id === 'error');
        if (!exists) return [...prev, { id: 'error', label: message, status: 'error' }];
        return prev.map((l) => (l.id === 'error' ? { ...l, label: message, status: 'error' } : l));
      });
      addToast(message, 'error', 5000);
    }
  };

  if (!isDistributionModalOpen || !distributionAgentId) return null;

  const agentDisplay = distributionAgentName || agents.find((a) => a.id === distributionAgentId)?.name || '';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md animate-in fade-in duration-300" />

      <div className="relative w-full max-w-md bg-white vercel-border rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-[#eaeaea] bg-[#fafafa]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-black text-white shrink-0">
              <CheckCheck size={20} className={!isFinished ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-black tracking-tight">一键开启全部技能</h3>
              <p className="text-[12px] text-slate-500 font-medium">
                平台: <span className="mono text-black">{agentDisplay}</span>
                {pendingCount > 0 && (
                  <span className="ml-2 text-slate-400">待分发 {pendingCount} 项</span>
                )}
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
              <Loader2 size={24} className="mb-2 animate-spin" />
              <span className="text-[12px] font-medium">准备分发任务...</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#fafafa] border-t border-[#eaeaea] flex justify-between items-center px-6">
          <div className="text-[12px] text-slate-400 font-bold mono">
            {hasError ? 'DISTRIBUTION_FAILED' : isFinished ? 'DISTRIBUTION_COMPLETE' : `DISTRIBUTING_${Math.round(progress)}%`}
          </div>
          <button
            type="button"
            onClick={closeDistributionModal}
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

export default DistributionModal;

