
import React from 'react';
import { useAgentStore } from '../stores/useAgentStore';
import { ICONS, PLATFORM_ICONS } from '../constants';
import { useSkillStore } from '../stores/useSkillStore';
import { syncAllSkillsDistribution } from '../services/syncService';
import { AgentId } from '../types';

const AgentsPage: React.FC = () => {
  const agents = useAgentStore(state => state.agents);
  const updateAgentPath = useAgentStore(state => state.updateAgentPath);
  const toggleAgentEnabled = useAgentStore(state => state.toggleAgentEnabled);

  const syncAll = () => {
    const updatedAgents = useAgentStore.getState().agents;
    const currentSkills = useSkillStore.getState().skills;
    void syncAllSkillsDistribution(currentSkills, updatedAgents).catch(console.error);
  };

  const handleToggleEnabled = (agentId: AgentId) => {
    toggleAgentEnabled(agentId);
    syncAll();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="space-y-1">
        <h2 className="text-[32px] font-bold text-black tracking-tight">Agent 平台</h2>
        <p className="text-slate-500 text-[15px]">配置各 AI Agent 平台的技能分发路径。</p>
      </div>

      <div className="vercel-border bg-white rounded-lg overflow-hidden divide-y divide-[#eaeaea]">
        {agents.map((agent) => {
          const BrandIcon = PLATFORM_ICONS[agent.id];
          return (
            <div key={agent.id} className="p-6 flex items-center gap-8 group">
              <div className="w-12 h-12 bg-[#fafafa] vercel-border rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 overflow-hidden text-black">
                {BrandIcon ? <BrandIcon size={28} /> : <div className="text-slate-300 font-bold">{agent.name.charAt(0)}</div>}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold text-black">{agent.name}</h3>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    agent.enabled ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    {agent.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-[#fafafa] border border-[#eaeaea] rounded-md px-3 py-1.5">
                  <span className="text-slate-400"><ICONS.Grid size={16} /></span>
                  <input 
                    type="text" 
                    value={agent.currentPath}
                    onChange={(e) => updateAgentPath(agent.id, e.target.value)}
                    onBlur={syncAll}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                    }}
                    className="bg-transparent border-none focus:ring-0 text-[12px] mono text-slate-600 w-full"
                    disabled={!agent.enabled}
                    placeholder="分发路径..."
                    aria-label={`${agent.name} 分发路径`}
                    name={`agent-path-${agent.id}`}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

              </div>

              <button 
                onClick={() => handleToggleEnabled(agent.id)}
                className={`
                  px-4 py-1.5 rounded-md text-[12px] font-bold transition-all border
                  ${agent.enabled 
                    ? 'bg-white text-slate-500 border-[#eaeaea] hover:text-black hover:border-black' 
                    : 'bg-black text-white border-black'}
                `}
              >
                {agent.enabled ? '禁用' : '启用'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-[#fafafa] vercel-border rounded-lg p-6 flex gap-4">
        <div className="pt-1"><ICONS.LightBulb size={20} className="text-amber-500" /></div>
        <p className="text-[13px] text-slate-500 leading-relaxed">
          <span className="font-bold text-black">配置帮助:</span> 请确保提供的路径可供 Skills Manager 进程访问。您可以使用绝对路径，或相对于用户目录的路径。
        </p>
      </div>
    </div>
  );
};

export default AgentsPage;
