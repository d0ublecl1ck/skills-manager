import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, SearchCheck } from 'lucide-react';

import { useAgentStore } from '../stores/useAgentStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useToastStore } from '../stores/useToastStore';
import { useUIStore } from '../stores/useUIStore';
import { syncSelectedSkillsToManagerStore } from '../services/syncService';
import { getEffectiveAgents } from '../services/effectiveAgents';

const StartupDetectModal: React.FC = () => {
  const isOpen = useUIStore((state) => state.isStartupDetectModalOpen);
  const detectedSkills = useUIStore((state) => state.startupDetectedSkills);
  const closeModal = useUIStore((state) => state.closeStartupDetectModal);

  const agents = useAgentStore((state) => state.agents);
  const mergeSkills = useSkillStore((state) => state.mergeSkills);
  const addLog = useSkillStore((state) => state.addLog);
  const addToast = useToastStore((state) => state.addToast);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
      setIsSubmitting(false);
      return;
    }

    setSelectedIds(detectedSkills.map((skill) => skill.id));
    setIsSubmitting(false);
  }, [isOpen, detectedSkills]);

  const selectedCount = selectedIds.length;
  const allSelected = detectedSkills.length > 0 && selectedCount === detectedSkills.length;

  const canSubmit = selectedCount > 0 && !isSubmitting;

  const subtitle = useMemo(() => {
    if (detectedSkills.length === 0) return '未检测到新增技能';
    return `检测到 ${detectedSkills.length} 个新技能，默认已全选`;
  }, [detectedSkills.length]);

  const toggleSkill = (skillId: string) => {
    if (isSubmitting) return;
    setSelectedIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
  };

  const toggleAll = () => {
    if (isSubmitting) return;
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(detectedSkills.map((skill) => skill.id));
  };

  const handleSkip = () => {
    if (isSubmitting) return;
    closeModal();
  };

  const handleConfirm = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const selectedSkills = detectedSkills.filter((skill) => selectedIds.includes(skill.id));
      const synced = await syncSelectedSkillsToManagerStore(
        getEffectiveAgents(agents),
        selectedSkills.map((skill) => skill.name),
      );

      if (synced.length > 0) {
        mergeSkills(synced);
      }

      const sourceNameMap = new Map<string, string>();
      for (const skill of selectedSkills) {
        for (const name of skill.sourceAgentNames) {
          sourceNameMap.set(name, name);
        }
      }
      const fromAgents = Array.from(sourceNameMap.values());
      const fromLabel = fromAgents.length > 0 ? fromAgents.join('、') : '未知来源';

      addLog({
        action: 'sync',
        skillId: '启动检测',
        status: 'success',
        message: `启动检测发现新技能来源于 ${fromLabel}，已同步 ${synced.length} 个技能到中心库。`,
      });

      addToast(`已同步 ${synced.length} 个新技能`, 'success');
      closeModal();
    } catch (error) {
      console.error(error);
      addLog({
        action: 'sync',
        skillId: '启动检测',
        status: 'error',
        message: `启动检测同步失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
      addToast('启动同步失败，请稍后重试', 'error');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md animate-in fade-in duration-300" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="startup-detect-title"
        className="relative w-full max-w-2xl bg-white vercel-border rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 duration-300"
      >
        <div className="p-6 border-b border-[#eaeaea] bg-[#fafafa]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-black text-white shrink-0" aria-hidden="true">
              <SearchCheck size={20} />
            </div>
            <div>
              <h3 id="startup-detect-title" className="text-[16px] font-bold text-black tracking-tight">检测到新的 Skills</h3>
              <p className="text-[12px] text-slate-500 font-medium">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              className="text-[13px] font-semibold text-black underline-offset-4 hover:underline disabled:opacity-40"
              onClick={toggleAll}
              disabled={isSubmitting || detectedSkills.length === 0}
            >
              {allSelected ? '取消全选' : '全选'}
            </button>
            <div className="text-[12px] text-slate-500">已选择 {selectedCount} / {detectedSkills.length}</div>
          </div>

          <div className="max-h-[340px] overflow-y-auto rounded-xl border border-[#eaeaea] divide-y divide-[#f2f2f2]">
            {detectedSkills.map((skill) => {
              const checked = selectedIds.includes(skill.id);
              const sourceLabel = skill.sourceAgentNames.join('、');

              return (
                <label
                  key={skill.id}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isSubmitting}
                    onChange={() => toggleSkill(skill.id)}
                    name={`startup-skill-${skill.id}`}
                    className="mt-[2px] h-4 w-4 rounded border-slate-300 text-black focus:ring-black"
                  />
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold text-black break-words">{skill.name}</div>
                    <div className="text-[12px] text-slate-500 mt-1">来源：{sourceLabel || '未知来源'}</div>
                  </div>
                </label>
              );
            })}

            {detectedSkills.length === 0 && (
              <div className="px-4 py-10 text-center text-[13px] text-slate-400">未发现可同步的新技能</div>
            )}
          </div>
        </div>

        <div className="p-4 bg-[#fafafa] border-t border-[#eaeaea] flex justify-end items-center gap-3 px-6">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#eaeaea] text-slate-600 hover:text-black hover:border-[#d6d6d6] disabled:opacity-40"
          >
            稍后处理
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-5 py-2 rounded-lg text-[13px] font-bold bg-black text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                正在同步…
              </>
            ) : (
              '同步到中心库'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartupDetectModal;
