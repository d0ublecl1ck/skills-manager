
import React from 'react';
import { Info } from 'lucide-react';
import { resetStore } from '../services/tauriClient';

const SettingsPage: React.FC = () => {
  const resetData = async () => {
    if (confirm('确定要重置所有数据吗？这将永久删除所有已安装的技能和配置。')) {
      try {
        await resetStore();
      } catch (e) {
        console.error(e);
      }
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in duration-500">
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-[28px] font-bold text-black tracking-tight">项目设置</h2>
          <p className="text-slate-500 text-[14px]">管理您的技能库数据和系统核心配置。</p>
        </div>

        <div className="vercel-border bg-white rounded-lg overflow-hidden divide-y divide-[#eaeaea]">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h4 className="text-[14px] font-bold text-black">导出配置</h4>
              <p className="text-[12px] text-slate-400">下载当前技能列表及 Agent 映射关系的备份文件（JSON 格式）。</p>
            </div>
            <button className="bg-black text-white px-4 py-2 rounded-md text-[13px] font-bold hover:bg-slate-800 transition-all">
              导出备份
            </button>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <h4 className="text-[14px] font-bold text-black">重置库</h4>
              <p className="text-[12px] text-slate-400">永久删除所有技能并重置 Agent 配置（此操作不可恢复）。</p>
            </div>
            <button 
              onClick={resetData}
              className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-md text-[13px] font-bold hover:bg-red-50 transition-all"
            >
              重置数据
            </button>
          </div>
        </div>
      </section>

      <section className="p-8 bg-[#fafafa] vercel-border rounded-xl border-dashed">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Info size={20} />
          </div>
          <h4 className="text-[14px] font-bold text-black">本地存储模式</h4>
          <p className="text-[12px] text-slate-500 max-w-md">
            Skills Manager 目前完全在您的本地运行。所有数据存储在应用本地目录中，不会上传到任何云端服务器，确保您的 Agent 路径和技能资产隐私安全。
          </p>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
