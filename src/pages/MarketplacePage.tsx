
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { installSkillCli } from '../services/skillService';
import { useSkillStore } from '../stores/useSkillStore';
import { useToastStore } from '../stores/useToastStore';
import { Globe, ExternalLink } from 'lucide-react';
import { ArrowRight, Loader2, X } from 'lucide-react';

const MarketplacePage: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const addSkill = useSkillStore((state) => state.addSkill);
  const addLog = useSkillStore((state) => state.addLog);
  const addToast = useToastStore((state) => state.addToast);

  const validateUrl = (url: string) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return { valid: false, message: '请输入安装地址' };

    const isGithub = trimmedUrl.includes('github.com/');
    const isUrl = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');

    if (!isUrl && !isGithub) {
      return { valid: false, message: '请输入有效的 GitHub 地址或网址' };
    }

    return { valid: true };
  };

  const handleInitiateInstall = () => {
    const validation = validateUrl(repoUrl);
    if (!validation.valid) {
      addToast(validation.message || '输入无效', 'error');
      return;
    }

    const parts = repoUrl.split('/').filter(Boolean);
    const defaultName = parts[parts.length - 1] || 'new-skill';
    setCustomName(defaultName.replace('.git', '').replace('.zip', '').trim());
    setShowConfirmModal(true);
  };

  const handleCompleteInstall = async () => {
    const skillName = customName.trim();
    if (!skillName) {
      addToast('请输入技能名称', 'error');
      return;
    }

    setShowConfirmModal(false);
    setIsInstalling(true);

    try {
      const newSkill = await installSkillCli(repoUrl.trim(), skillName);
      addSkill(newSkill);
      addLog({
        action: 'install',
        skillId: newSkill.name,
        status: 'success',
        message: `从 ${repoUrl} 安装成功`
      });
      addToast(`技能 "${newSkill.name}" 安装成功`, 'success');
      setIsInstalling(false);
      setRepoUrl('');
      setCustomName('');
    } catch (e) {
      console.error(e);
      addLog({
        action: 'install',
        skillId: skillName,
        status: 'error',
        message: `安装失败: ${e instanceof Error ? e.message : '未知错误'}`
      });
      addToast('安装失败，请检查地址是否可访问', 'error');
      setIsInstalling(false);
    }
  };

  const resourceSites = [
    {
      name: 'skills.sh',
      description: '全球领先的 AI Agent 技能搜索与发现平台，涵盖各种生产力插件。',
      url: 'https://skills.sh/',
      tags: ['官方推荐', '社区驱动']
    },
    {
      name: 'Awesome Agent Skills',
      description: 'GitHub 上最全的 Agent 技能精选列表，适合开发者寻找高质量资源。',
      url: 'https://github.com/topics/agent-skills',
      tags: ['GitHub', '开源']
    },
    {
      name: 'AgentHub',
      description: '专业的 Agent 能力分发枢纽，支持多种模型协议的技能一键部署。',
      url: 'https://agenthub.dev/',
      tags: ['生态', '分发']
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-in slide-in-from-bottom-2 duration-500">
      <section className="text-center space-y-4">
        <h2 className="text-[36px] font-bold text-black tracking-tight leading-none">安装新技能</h2>
        <p className="text-slate-500 text-[16px]">输入 GitHub 仓库地址或技能包网址，一键自动安装并分发。</p>
        
        <div className="mt-10 flex gap-2 bg-white border border-[#eaeaea] p-1.5 rounded-xl shadow-sm transition-all duration-200 focus-within:border-black focus-within:ring-[4px] focus-within:ring-slate-100">
          <div className="flex-1 flex items-center px-4 gap-3">
             <ICONS.Github size={20} className="text-slate-400" />
             <input 
              type="text" 
              placeholder="github.com/用户/仓库 或 https://example.com/skill.zip"
              className="w-full bg-transparent border-none outline-none focus:ring-0 text-[14px] text-slate-800 placeholder-slate-400"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInitiateInstall()}
              disabled={isInstalling}
              aria-label="技能仓库地址"
              name="repoUrl"
              autoComplete="off"
              inputMode="url"
             spellCheck={false}
             />
          </div>
          <button 
            onClick={handleInitiateInstall}
            disabled={isInstalling}
            className={`
              px-6 py-2 rounded-md text-[13px] font-bold transition-all
              ${isInstalling 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-slate-800'}
            `}
          >
            {isInstalling ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                安装中
              </span>
            ) : '安装'}
          </button>
        </div>
        {isInstalling && (
          <p className="text-[12px] text-slate-400 animate-pulse mt-2">
            正在分析资源并建立本地索引，请稍候...
          </p>
        )}
      </section>

      {/* 技能名称确认 Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowConfirmModal(false)}
          />
          <div className="relative w-full max-w-[400px] bg-white border border-[#eaeaea] rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.1)] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[#eaeaea]">
              <h3 className="text-[16px] font-bold text-black tracking-tight">确认技能信息</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
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
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCompleteInstall()}
                />
                <p className="text-[11px] text-slate-400">该名称将作为 `--skill` 参数传入并用于本地目录标识。</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 flex gap-3">
                <ICONS.Github size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="text-[12px] text-slate-500 font-mono break-all leading-relaxed">
                  {repoUrl}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#fafafa] border-t border-[#eaeaea] flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-[13px] font-bold text-slate-500 hover:text-black transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCompleteInstall}
                className="px-6 py-2 bg-black text-white text-[13px] font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                确认安装
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-px bg-[#eaeaea]"></div>

      <section className="space-y-8">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[20px] font-bold text-black">技能资源发现</h3>
          <p className="text-[13px] text-slate-400 font-medium">访问外部社区寻找更多灵感</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {resourceSites.map((site) => (
            <a 
              key={site.name} 
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white vercel-border rounded-lg p-5 hover:border-black transition-all group block"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 vercel-border bg-[#fafafa] rounded flex items-center justify-center">
                    <Globe size={18} className="text-slate-600" />
                  </div>
                  <h4 className="text-[14px] font-bold text-black">{site.name}</h4>
                </div>
                <div className="text-slate-300 group-hover:text-black transition-colors">
                  <ExternalLink size={16} />
                </div>
              </div>
              <p className="text-[12px] text-slate-500 mb-6 leading-relaxed h-12 line-clamp-2">
                {site.description}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                {site.tags.map(tag => (
                  <React.Fragment key={tag}>
                    <span>{tag}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200 last:hidden"></span>
                  </React.Fragment>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MarketplacePage;
