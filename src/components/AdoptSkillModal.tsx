import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Github, Info, Layout, Link, Link2, RefreshCcw, Zap } from 'lucide-react';

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
  const [bindMode, setBindMode] = useState<'link' | 'reinstall'>('link');

  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setSourceUrl(skill.sourceUrl || '');
      setSelectedAgents(skill.enabledAgents);
      setBindMode('link');
    }
  }, [isOpen, skill]);

  if (!isOpen) return null;

  const toggleAgent = (id: AgentId) => {
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handleBind = async () => {
    const repoUrl = sourceUrl.trim() || (skill.sourceUrl || '').trim();
    if (!repoUrl) {
      addToast('请先填写可访问的源码地址', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      adoptSkill(skill.id, {
        sourceUrl: repoUrl,
        enabledAgents: selectedAgents,
      });

      if (bindMode === 'reinstall') {
        await reInstallSkill(skill.id);
      }

      addToast(
        bindMode === 'reinstall' ? `"${skill.name}" 已重新安装并完成绑定` : `"${skill.name}" 来源绑定成功`,
        'success',
      );
      onClose();
    } catch (e) {
      addToast(e instanceof Error ? e.message : '绑定失败，请检查网络连接', 'error');
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
                <Link2 size={28} />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-[20px] font-bold text-black tracking-tight">绑定来源引导</h3>
              <p className="text-[13px] text-slate-500 leading-relaxed px-4">
                将本地资产 <span className="font-bold text-black">"{skill.name}"</span> 关联至管理平台。绑定后，您可以：
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Layout, label: '统一分发控制' },
                { icon: RefreshCcw, label: '一键检查更新' },
                { icon: Zap, label: '快捷跳转源码' },
                { icon: Info, label: '本地属性托管' },
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
                去绑定来源
                <ArrowRight size={18} />
              </button>
              <button
                onClick={onClose}
                className="w-full h-10 text-slate-400 hover:text-black text-[13px] font-medium transition-colors"
              >
                暂不处理
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  设置源码地址
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

              <div className="pt-2">
                <div className="flex p-1 bg-[#fafafa] rounded-lg border border-[#eaeaea]">
                  <button
                    onClick={() => setBindMode('link')}
                    className={`flex-1 py-2 text-[12px] font-bold rounded-md transition-all ${bindMode === 'link' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    仅建立关联
                  </button>
                  <button
                    onClick={() => setBindMode('reinstall')}
                    className={`flex-1 py-2 text-[12px] font-bold rounded-md transition-all ${bindMode === 'reinstall' ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    执行覆盖重装
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleBind}
                disabled={isProcessing}
                className="w-full h-12 bg-black text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-black/5"
              >
                {isProcessing ? (
                  <>
                    <RefreshCcw size={18} className="animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>{bindMode === 'link' ? '立即保存并绑定' : '重新安装并绑定'}</>
                )}
              </button>
              <button
                onClick={() => setStep('info')}
                disabled={isProcessing}
                className="w-full h-10 text-slate-400 hover:text-black text-[13px] font-medium transition-colors"
              >
                返回
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdoptSkillModal;
