
import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Skill } from '../types';
import { useAgentStore } from '../stores/useAgentStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { PLATFORM_ICONS } from '../constants';
import { Trash2, CheckSquare } from 'lucide-react';
import { openSkillFolder } from '../services/openSkillFolder';
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

const SkillCard: React.FC<SkillCardProps> = ({ skill }) => {
  // 仅获取已在全局设置中启用的 Agent
  const enabledAgentsInSystem = useAgentStore(useShallow((state) => state.agents.filter(a => a.enabled)));
  const toggleAgent = useSkillStore((state) => state.toggleAgent);
  const setSkillAgents = useSkillStore((state) => state.setSkillAgents);
  const removeSkill = useSkillStore((state) => state.removeSkill);
  const storagePath = useSettingsStore((state) => state.storagePath);

  // 判断状态逻辑
  const activeAgentIds = enabledAgentsInSystem.map(a => a.id);
  const isAllEnabled = activeAgentIds.length > 0 && activeAgentIds.every(id => skill.enabledAgents.includes(id));
  const hasSomeEnabled = skill.enabledAgents.length > 0;

  const handleOpenFolder: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select')) return;
    void openSkillFolder(storagePath, skill.name).catch(console.error);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    void openSkillFolder(storagePath, skill.name).catch(console.error);
  };

  const handleToggleAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAllEnabled) {
      setSkillAgents(skill.id, []);
    } else {
      setSkillAgents(skill.id, activeAgentIds);
    }
  };

  return (
    <div
      className="bg-white border border-[#eaeaea] rounded-xl p-6 transition-all group hover:border-black vercel-card-hover flex flex-col h-full relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      title="点击打开文件夹"
      role="button"
      tabIndex={0}
      onClick={handleOpenFolder}
      onKeyDown={handleKeyDown}
    >
      {/* 顶部标题和删除 */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[16px] font-bold text-black tracking-tight leading-tight flex-1 pr-4">
          {skill.name}
        </h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
              title="卸载技能"
              aria-label="卸载技能"
            >
              <Trash2 size={16} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="vercel-border bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-black">确认卸载？</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-500">
                将从中心库移除 <span className="mono text-black">{skill.name}</span>，并清理所有已启用平台下的同名目录。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="vercel-border">取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => removeSkill(skill.id)}
              >
                卸载
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="text-[12px] text-slate-400 mono mb-6">
        {skill.id}
      </div>

      {/* 分割线 */}
      <div className="h-px bg-[#f3f3f3] w-full mb-5"></div>

      {/* 平台控制区域 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">已启用平台</span>
            <span className="text-[11px] font-medium px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded-full mono">
              {skill.enabledAgents.length}/{enabledAgentsInSystem.length}
            </span>
          </div>
        </div>

        {/* 平台图标列表 */}
        <div className="flex flex-wrap gap-2.5">
          {/* 1. 渲染所有已启用的平台图标 */}
          {enabledAgentsInSystem.map((agent) => {
            const BrandIcon = PLATFORM_ICONS[agent.id];
            const isEnabledForSkill = skill.enabledAgents.includes(agent.id);
            
            return (
              <button
                key={agent.id}
                onClick={() => toggleAgent(skill.id, agent.id)}
                title={agent.name}
                aria-label={`${agent.name}${isEnabledForSkill ? '（已启用）' : '（未启用）'}`}
                className={`
                  relative w-10 h-10 rounded-xl border transition-all flex items-center justify-center overflow-hidden
                  ${isEnabledForSkill 
                    ? 'border-black bg-white ring-1 ring-black shadow-sm' 
                    : 'border-[#eaeaea] bg-slate-50 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 hover:border-slate-300'}
                `}
              >
                {BrandIcon ? (
                  <BrandIcon size={20} />
                ) : (
                  <span className="text-[10px] font-bold uppercase">{agent.name.slice(0, 2)}</span>
                )}
              </button>
            );
          })}

          {/* 2. 全选/取消全选按钮 - 始终排在最后 */}
          {enabledAgentsInSystem.length > 0 && (
            <button
              onClick={handleToggleAll}
              title={isAllEnabled ? "取消全选" : "全选所有平台"}
              aria-label={isAllEnabled ? "取消全选" : "全选所有平台"}
              className={`
                relative w-10 h-10 rounded-xl border transition-all flex items-center justify-center
                ${isAllEnabled 
                  ? 'border-black bg-black text-white' 
                  : hasSomeEnabled 
                    ? 'border-black bg-white text-black ring-1 ring-black'
                    : 'border-[#eaeaea] bg-slate-50 text-slate-300 hover:border-black hover:text-black'}
              `}
            >
              <CheckSquare size={18} />
            </button>
          )}

          {enabledAgentsInSystem.length === 0 && (
            <p className="text-[11px] text-slate-400 italic">请先在 Agent 管理中启用平台</p>
          )}
        </div>
      </div>

      {skill.sourceUrl && (
        <div className="mt-6 flex items-center justify-end">
          <a
            href={skill.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-slate-300 hover:text-black transition-colors underline decoration-slate-200"
          >
            源码
          </a>
        </div>
      )}
    </div>
  );
};

export default SkillCard;
