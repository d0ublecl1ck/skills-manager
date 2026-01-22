
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ICONS, PLATFORM_ICONS } from '../constants';
import { useAgentStore } from '../stores/useAgentStore';
import { useSkillStore } from '../stores/useSkillStore';

const Sidebar: React.FC = () => {
  const agents = useAgentStore(state => state.agents);
  const skills = useSkillStore(state => state.skills);

  const enabledAgents = agents.filter(a => a.enabled);

  const navItems = [
    { to: '/', Icon: ICONS.Grid, label: '技能库' },
    { to: '/marketplace', Icon: ICONS.Market, label: '技能市场' },
    { to: '/agents', Icon: ICONS.Sync, label: 'Agent 管理' },
    { to: '/settings', Icon: ICONS.Settings, label: '系统设置' },
  ];

  return (
    <aside className="w-60 bg-white border-r border-[#eaeaea] flex flex-col h-screen sticky top-0 select-none">
      {/* 顶部 Logo - 固定 */}
      <div className="p-6 pb-2 shrink-0">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white">
             <ICONS.Logo size={14} />
          </div>
          <h1 className="text-[14px] font-bold tracking-tight text-black">Skills Manager</h1>
        </div>
      </div>
      
      {/* 导航区域 - 支持滚动 */}
      <nav className="flex-1 p-4 space-y-0.5 mt-4 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2 rounded-md transition-all text-[13px] font-medium
              ${isActive 
                ? 'bg-slate-50 text-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]' 
                : 'text-slate-500 hover:text-black hover:bg-slate-50'}
            `}
          >
            <span className="scale-[0.85] opacity-70 group-hover:opacity-100">
              <item.Icon size={18} />
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="mt-10 pb-4">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Agent 平台
          </div>
          <div className="space-y-0.5 mt-1">
            {enabledAgents.map(agent => {
              const BrandIcon = PLATFORM_ICONS[agent.id];
              return (
                <NavLink 
                  key={agent.id}
                  to="/agents"
                  className="flex items-center justify-between px-3 py-1.5 text-[12px] text-slate-500 hover:bg-slate-50 hover:text-black rounded-md group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {BrandIcon ? (
                      <div className="flex items-center overflow-hidden">
                        <BrandIcon size={16} />
                      </div>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    )}
                    <span className="text-slate-700 font-medium">
                      {agent.name}
                    </span>
                  </div>
                </NavLink>
              );
            })}
            
            <Link 
              to="/agents" 
              className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-400 hover:text-black transition-colors"
            >
              <div className="w-4 h-4 rounded border border-dashed border-slate-300 flex items-center justify-center">
                <ICONS.Plus size={10} />
              </div>
              <span>管理更多平台</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* 底部统计卡片 - 固定 */}
      <div className="p-4 border-t border-[#eaeaea] shrink-0 bg-white">
        <div className="bg-[#fafafa] border border-[#eaeaea] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">技能总量</span>
            <span className="text-[14px] font-bold text-black mono">{skills.length}</span>
          </div>
          <div className="h-px bg-[#eaeaea] w-full"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">版本号</span>
            <span className="text-[14px] font-bold text-black mono uppercase tracking-tighter">v1.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

