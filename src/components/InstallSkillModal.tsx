import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { PLATFORM_ICONS } from '../constants';
import type { AgentId, AgentInfo } from '../types';

type Props = {
  open: boolean;
  repoUrl: string;
  skillName: string;
  agents: AgentInfo[];
  selectedAgentIds: AgentId[];
  onChangeSkillName: (name: string) => void;
  onToggleAgent: (id: AgentId) => void;
  onToggleAll: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const InstallSkillModal: React.FC<Props> = ({
  open,
  repoUrl,
  skillName,
  agents,
  selectedAgentIds,
  onChangeSkillName,
  onToggleAgent,
  onToggleAll,
  onCancel,
  onConfirm,
}) => {
  const allSelected = useMemo(() => {
    if (agents.length === 0) return false;
    return agents.every((a) => selectedAgentIds.includes(a.id));
  }, [agents, selectedAgentIds]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-white/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-[520px] bg-white border border-[#eaeaea] rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-[#eaeaea]">
          <h3 className="text-[16px] font-bold text-black tracking-tight">确认技能信息</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-slate-50 rounded-md transition-colors text-slate-400"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
              目标技能名称
            </label>
            <input
              autoFocus
              type="text"
              placeholder="例如: baoyu-post-to-x"
              className="w-full bg-[#fafafa] border border-[#eaeaea] rounded-xl px-4 py-3 text-[14px] text-black focus:border-black focus:ring-0 transition-all outline-none"
              value={skillName}
              onChange={(e) => onChangeSkillName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
            />
            <p className="text-[11px] text-slate-400">该名称将作为 `--skill` 参数传入并用于本地目录标识。</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                选择分发平台
              </label>
              <button
                type="button"
                className="text-[12px] font-bold text-slate-400 hover:text-black transition-colors"
                onClick={onToggleAll}
              >
                {allSelected ? '取消全选' : '全选'}
              </button>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {agents.map((agent) => {
                const selected = selectedAgentIds.includes(agent.id);
                const Icon = PLATFORM_ICONS[agent.id];
                const disabledHint = agent.enabled ? '' : '（未启用）';
                return (
                  <button
                    key={agent.id}
                    type="button"
                    className={`group flex h-12 items-center justify-center rounded-xl border transition-all ${
                      selected
                        ? 'border-black bg-white shadow-[0_6px_18px_rgba(0,0,0,0.10)]'
                        : 'border-[#eaeaea] bg-[#fafafa] opacity-70 grayscale'
                    }`}
                    onClick={() => onToggleAgent(agent.id)}
                    aria-label={agent.name}
                    title={`${agent.name}${disabledHint}`}
                  >
                    <span className="block transition-transform group-active:scale-95">
                      <Icon size={20} className={selected ? '' : 'opacity-70'} />
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400">
              提示：点击平台图标可切换；右上角可一键{allSelected ? '取消全选' : '全选'}。
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 flex gap-3">
            <div className="text-[12px] text-slate-500 font-mono break-all leading-relaxed">
              {repoUrl}
            </div>
          </div>
        </div>

        <div className="p-4 bg-[#fafafa] border-t border-[#eaeaea] flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[13px] font-bold text-slate-500 hover:text-black transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-black text-white text-[13px] font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            确认安装
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallSkillModal;
