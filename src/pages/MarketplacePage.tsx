
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { installSkill } from '../services/tauriClient';
import { useSkillStore } from '../stores/useSkillStore';
import { Globe, ExternalLink } from 'lucide-react';

const MarketplacePage: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);
  const addSkill = useSkillStore((state) => state.addSkill);
  const addLog = useSkillStore((state) => state.addLog);

  const handleInstall = async () => {
    if (!repoUrl) return;
    setIsInstalling(true);
    const startedAt = Date.now();
    
    try {
      const newSkill = await installSkill(repoUrl);
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 2000 - elapsed);

      setTimeout(() => {
        addSkill(newSkill);
        addLog({
          action: 'install',
          skillId: newSkill.name,
          status: 'success',
          message: `从 ${repoUrl} 自动安装成功`
        });
        setIsInstalling(false);
        setRepoUrl('');
      }, remaining);
    } catch (e) {
      console.error(e);
      addLog({
        action: 'install',
        skillId: '未知技能',
        status: 'error',
        message: `安装失败: ${e instanceof Error ? e.message : '未知错误'}`
      });
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
              onKeyDown={(e) => e.key === 'Enter' && handleInstall()}
              disabled={isInstalling}
              aria-label="技能仓库地址"
              name="repoUrl"
              autoComplete="off"
              inputMode="url"
              spellCheck={false}
             />
          </div>
          <button 
            onClick={handleInstall}
            disabled={isInstalling || !repoUrl}
            className={`
              px-6 py-2 rounded-md text-[13px] font-bold transition-all
              ${isInstalling 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-slate-800'}
            `}
          >
            {isInstalling ? '正在安装...' : '安装'}
          </button>
        </div>
        {isInstalling && (
          <p className="text-[12px] text-slate-400 animate-pulse mt-2">
            正在分析资源并建立本地索引，请稍候...
          </p>
        )}
      </section>

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
