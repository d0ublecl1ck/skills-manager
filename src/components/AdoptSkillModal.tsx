import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Github, Info, Link, RefreshCcw, ShieldCheck, Zap } from 'lucide-react';

import { PLATFORM_ICONS } from '../constants';
import type { AgentId, Skill } from '../types';
import { useAgentStore } from '../stores/useAgentStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useToastStore } from '../stores/useToastStore';

interface AdoptSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill: Skill;
}

const AdoptSkillModal: React.FC<AdoptSkillModalProps> = ({ isOpen, onClose, skill }) => {
  const agents = useAgentStore((state) => state.agents);
  const adoptSkill = useSkillStore((state) => state.adoptSkill);
  const reInstallSkill = useSkillStore((state) => state.reInstallSkill);
  const addToast = useToastStore((state) => state.addToast);

  const [step, setStep] = useState<'info' | 'setup'>('info');
  const [sourceUrl, setSourceUrl] = useState(skill.sourceUrl || '');
  const [selectedAgents, setSelectedAgents] = useState<AgentId[]>(skill.enabledAgents);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setSourceUrl(skill.sourceUrl || '');
      setSelectedAgents(skill.enabledAgents);
    }
  }, [isOpen, skill]);

  if (!isOpen) return null;

  const toggleAgent = (id: AgentId) => {
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleMigration = async () => {
    const repoUrl = sourceUrl.trim() || (skill.sourceUrl || '').trim();
    if (!repoUrl) {
      addToast('请先关联源码仓库地址（或先关闭并保持外部状态）', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      adoptSkill(skill.id, {
        sourceUrl: repoUrl,
        enabledAgents: selectedAgents,
      });

      await reInstallSkill(skill.id);

      addToast(`"${skill.name}" 已重新安装并纳入平台管理`, 'success');
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : '收编失败，请检查网络连接', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />

      <div className="relative w-full max-w-[480px] bg-white border border-[#eaeaea] rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.12)] overflow-hidden animate-in zoom-in-95">
        {step === 'info' ? (
          <div className="p-8 space-y-8">
            <div className="flex justify-center">
              <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
                <ShieldCheck size={28} />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-[20px] font-bold text-black tracking-tight">收编引导程序</h3>
              <p className="text-[13px] text-slate-500 leading-relaxed px-4">
                检测到 <span className="font-bold text-black">"{skill.name}"</span> 是外部安装资产。通过平台重新安装后，您将获得以下能力：
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: RefreshCcw, label: '跨平台同步' },
                { icon: Zap, label: '一键自动更新' },
                { icon: ShieldCheck, label: '版本覆盖保护' },
                { icon: Info, label: '云端元数据同步' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <item.icon size={14} className="text-slate-400" />
                  <span className="text-[12px] font-bold text-slate-600">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setStep('setup')}
                className="w-full h-12 bg-black text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-black/5"
              >
                开始迁移
                <ArrowRight size={18} />
              </button>
              <button
                onClick={onClose}
                className="w-full h-10 text-slate-400 hover:text-black text-[13px] font-medium transition-colors"
              >
                保持外部状态
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  关联源码仓库 (可选)
                  <Info size={10} className="opacity-50" />
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                    {sourceUrl.includes('github.com') ? <Github size={16} /> : <Link size={16} />}
                  </div>
                  <input
                    type="text"
                    placeholder="https://github.com/..."
                    className="w-full pl-11 pr-4 py-3 bg-[#fafafa] border border-[#eaeaea] rounded-xl text-[13px] focus:border-black focus:ring-0 outline-none transition-all"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-slate-400 italic px-1">关联仓库后可启用“一键覆盖更新”功能</p>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">同步至目标平台</label>
                <div className="grid grid-cols-4 gap-2">
                  {agents
                    .filter((a) => a.enabled)
                    .map((agent) => {
                      const BrandIcon = PLATFORM_ICONS[agent.id];
                      const isSelected = selectedAgents.includes(agent.id);
                      return (
                        <button
                          key={agent.id}
                          onClick={() => toggleAgent(agent.id)}
                          className={`
                            relative h-14 rounded-xl border flex items-center justify-center transition-all
                            ${isSelected ? 'border-black bg-white shadow-sm' : 'border-[#eaeaea] bg-[#fafafa] opacity-40 grayscale'}
                          `}
                        >
                          <BrandIcon size={20} />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1">
                              <CheckCircle2 size={12} className="text-black" fill="white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleMigration}
                disabled={isProcessing}
                className="w-full h-12 bg-black text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-black/5"
              >
                {isProcessing ? (
                  <>
                    <RefreshCcw size={18} className="animate-spin" />
                    正在重新安装...
                  </>
                ) : (
                  <>完成收编并覆盖重装</>
                )}
              </button>
              <button
                onClick={() => setStep('info')}
                disabled={isProcessing}
                className="w-full h-10 text-slate-400 hover:text-black text-[13px] font-medium transition-colors"
              >
                返回上一步
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdoptSkillModal;
