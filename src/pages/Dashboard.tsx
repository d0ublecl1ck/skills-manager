
import React, { useState, useMemo } from 'react';
import { useSkillStore } from '../stores/useSkillStore';
import { useAgentStore } from '../stores/useAgentStore';
import SkillCard from '../components/SkillCard';
import { PLATFORM_ICONS } from '../constants';
import { AgentId } from '../types';
import { RefreshCw, Search } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';

const Dashboard: React.FC = () => {
  const skills = useSkillStore(state => state.skills);
  const agents = useAgentStore(state => state.agents);
  const setSyncModalOpen = useUIStore((state) => state.setSyncModalOpen);
  const setDevModalOpen = useUIStore((state) => state.setDevModalOpen);
  
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentId | 'all'>('all');

  const enabledAgents = useMemo(() => agents.filter(a => a.enabled), [agents]);

  const filteredSkills = useMemo(() => {
    return skills.filter(skill => {
      const matchesSearch = skill.name.toLowerCase().includes(search.toLowerCase()) || 
                            skill.description.toLowerCase().includes(search.toLowerCase());
      const matchesAgent = selectedAgent === 'all' || skill.enabledAgents.includes(selectedAgent as AgentId);
      return matchesSearch && matchesAgent;
    });
  }, [skills, search, selectedAgent]);

  const handleSyncAll = async () => {
    setSyncModalOpen(true);
  };

  const handleUpdateAll = () => {
    setDevModalOpen(true);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-[32px] font-bold text-black tracking-tight leading-none">技能库</h2>
          <p className="text-slate-500 text-[15px]">管理并分发您的本地 AI Agent 技能资产。</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSyncAll}
            className="bg-white border border-[#eaeaea] hover:border-black text-black px-4 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2"
            title="将各 Agent 目录资产提取至中心库"
          >
            <RefreshCw size={14} className="opacity-40" />
            同步全部
          </button>
          <button
            onClick={handleUpdateAll}
            className="bg-white border border-[#eaeaea] hover:border-black text-black px-4 py-2 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2"
            title="在线检查所有技能的最新版本"
          >
            <RefreshCw size={14} className="opacity-40" />
            更新全库
          </button>
          <button className="bg-black border border-black hover:bg-white hover:text-black text-white px-5 py-2 rounded-lg text-[13px] font-semibold transition-all shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">
            添加技能
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-black">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="搜索技能名称、描述或平台..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#eaeaea] focus:border-black focus:ring-0 rounded-lg text-[14px] transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索技能"
            name="search"
            autoComplete="off"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 border-b border-[#eaeaea] pb-px overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedAgent('all')}
            className={`px-4 py-2 text-[13px] font-medium transition-all relative ${
              selectedAgent === 'all' 
              ? 'text-black' 
              : 'text-slate-400 hover:text-black'
            }`}
          >
            全部
            {selectedAgent === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>}
          </button>
          {enabledAgents.map(agent => {
            const BrandIcon = PLATFORM_ICONS[agent.id];
            const isSelected = selectedAgent === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`px-4 py-2 text-[13px] font-medium transition-all relative flex items-center gap-2 whitespace-nowrap ${
                  isSelected 
                  ? 'text-black font-bold' 
                  : 'text-slate-400 hover:text-black'
                }`}
              >
                {BrandIcon && (
                  <BrandIcon size={14} className={isSelected ? 'grayscale-0 opacity-100 scale-110' : 'opacity-30 grayscale'} />
                )}
                {agent.name}
                {isSelected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>}
              </button>
            );
          })}
        </div>
      </div>

      {filteredSkills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSkills.map(skill => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 border border-dashed border-[#eaeaea] rounded-xl bg-white">
          <div className="w-12 h-12 bg-[#fafafa] rounded-full flex items-center justify-center mb-4 vercel-border">
            <Search size={24} className="text-slate-300" />
          </div>
          <p className="text-[14px] font-medium text-slate-500">未找到相关技能。</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
