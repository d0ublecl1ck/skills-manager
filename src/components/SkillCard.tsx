import React, { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ExternalLink, Link2, RefreshCcw, Trash2 } from 'lucide-react';

import type { AgentId, Skill } from '../types';
import { PLATFORM_ICONS } from '../constants';
import { getSkillDescriptionFromMd } from '../services/skillMdService';
import { useAgentStore } from '../stores/useAgentStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useToastStore } from '../stores/useToastStore';
import AdoptSkillModal from './AdoptSkillModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface SkillCardProps {
  skill: Skill;
}

const DESCRIPTION_CACHE = new Map<string, string>();

const SkillCard: React.FC<SkillCardProps> = ({ skill }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [descriptionFromMd, setDescriptionFromMd] = useState<string | null>(() => {
    return DESCRIPTION_CACHE.get(skill.name) ?? null;
  });

  const enabledAgentsInSystem = useAgentStore(
    useShallow((state) => state.agents.filter((a) => a.enabled)),
  );
  const toggleAgent = useSkillStore((state) => state.toggleAgent);
  const removeSkill = useSkillStore((state) => state.removeSkill);
  const reInstallSkill = useSkillStore((state) => state.reInstallSkill);
  const addToast = useToastStore((state) => state.addToast);

  const isAdopted = useMemo(() => {
    if (typeof skill.isAdopted === 'boolean') return skill.isAdopted;
    return (skill.installSource ?? 'platform') === 'platform';
  }, [skill.installSource, skill.isAdopted, skill.sourceUrl]);

  useEffect(() => {
    if (skill.description) return;
    if (DESCRIPTION_CACHE.has(skill.name)) {
      setDescriptionFromMd(DESCRIPTION_CACHE.get(skill.name) ?? null);
      return;
    }

    let cancelled = false;
    void getSkillDescriptionFromMd(skill.name)
      .then((desc) => {
        if (cancelled) return;
        if (!desc) return;
        DESCRIPTION_CACHE.set(skill.name, desc);
        setDescriptionFromMd(desc);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [skill.name, skill.description]);

  const handleToggleAgent = (agentId: AgentId, agentName: string) => {
    if (!isAdopted) {
      addToast('请先点击下方“绑定来源”以启用管理功能', 'info');
      setShowAdoptModal(true);
      return;
    }
    const isCurrentlyEnabled = skill.enabledAgents.includes(agentId);
    toggleAgent(skill.id, agentId);
    addToast(
      isCurrentlyEnabled ? `${skill.name} 已在 ${agentName} 禁用` : `${skill.name} 已在 ${agentName} 启用`,
      'info',
    );
  };

  const handleUpdate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAdopted) {
      setShowAdoptModal(true);
      return;
    }

    if (isUpdating) return;

    setIsUpdating(true);
    try {
      await reInstallSkill(skill.id);
      addToast(`"${skill.name}" 资产已同步至最新`, 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : '更新失败，请检查网络连接', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className={`vercel-card bg-white p-6 flex flex-col h-full group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ${!isAdopted ? 'border-dashed' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1 flex-1 min-w-0 mr-2">
          <h3 className="text-[15px] font-bold text-black tracking-tight leading-tight truncate" data-testid="skill-name">
            {skill.name}
          </h3>

          {!isAdopted && (
            <div className="pt-0.5">
              <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[10px] font-bold whitespace-nowrap">
                外部识别
              </span>
            </div>
          )}
          <p className="text-[11px] text-slate-400 font-medium truncate">来自 {skill.author || 'Unknown'}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className={`p-1.5 text-slate-400 hover:text-black hover:bg-slate-50 rounded-md transition-all ${isUpdating ? 'animate-spin opacity-50' : 'active:scale-90'}`}
            title={isAdopted ? '检查并执行更新' : '绑定来源后开启自动更新'}
          >
            <RefreshCcw size={14} />
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all active:scale-90"
                title="移动到垃圾箱"
                aria-label="移动到垃圾箱"
              >
                <Trash2 size={14} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="vercel-border bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-black">移入垃圾箱？</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-500">
                  将把 <span className="mono text-black">{skill.name}</span> 移入垃圾箱，并从所有已启用平台目录移除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="vercel-border">取消</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => removeSkill(skill.id)}
                >
                  移入垃圾箱
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <p className="text-[13px] text-[#666] leading-relaxed mb-6 flex-1 line-clamp-2">
        {skill.description || descriptionFromMd || '暂无描述'}
      </p>

      <div className="flex flex-wrap gap-2.5 mb-8">
        {enabledAgentsInSystem.map((agent) => {
          const BrandIcon = PLATFORM_ICONS[agent.id];
          const isEnabled = skill.enabledAgents.includes(agent.id);
          return (
            <button
              key={agent.id}
              onClick={() => handleToggleAgent(agent.id, agent.name)}
              className={`
                relative w-10 h-10 rounded-lg border flex items-center justify-center transition-all duration-200 active:scale-95
                ${isEnabled ? 'border-black bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)]' : 'border-[#eaeaea] bg-[#fafafa] grayscale opacity-30 hover:opacity-100 hover:grayscale-0 hover:border-[#ccc] hover:bg-white'}
                ${!isAdopted ? 'cursor-not-allowed' : ''}
              `}
              title={agent.name}
              aria-label={`${agent.name}${isEnabled ? '（已启用）' : '（未启用）'}`}
            >
              <div className={`transition-transform duration-200 ${isEnabled ? 'scale-100' : 'scale-90'}`}>
                <BrandIcon size={20} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-4 border-t border-[#eaeaea] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAdopted ? (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span className="text-[10px] font-bold text-slate-400 mono uppercase tracking-tight">
                Active Manager
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowAdoptModal(true)}
              className="flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full text-[11px] font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
            >
              <Link2 size={12} />
              绑定来源
            </button>
          )}
        </div>
        <div className="flex gap-2.5">
          {skill.sourceUrl && (
            <a
              href={skill.sourceUrl}
              target="_blank"
              className="text-[#999] hover:text-black transition-colors p-1"
              title="查看原始仓库"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      <AdoptSkillModal isOpen={showAdoptModal} onClose={() => setShowAdoptModal(false)} skill={skill} />
    </div>
  );
};

export default SkillCard;
