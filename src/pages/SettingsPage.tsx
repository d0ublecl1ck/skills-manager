
import React, { useState } from 'react';
import { Info, Folder, RotateCcw, Download, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { resetStore } from '../services/skillService';
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
} from '../components/ui/alert-dialog';

const SettingsPage: React.FC = () => {
  const {
    storagePath,
    setStoragePath,
    resetSettings,
    recycleBinRetentionDays,
    setRecycleBinRetentionDays,
  } = useSettingsStore();
  const [isSaved, setIsSaved] = useState(false);

  const handlePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStoragePath(e.target.value);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRetentionChange = (value: number) => {
    const days = Math.min(90, Math.max(1, Number.isFinite(value) ? value : 15));
    setRecycleBinRetentionDays(days);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetData = async () => {
    try {
      await resetStore();
    } catch (e) {
      console.error(e);
    }
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="space-y-1">
        <h2 className="text-[32px] font-bold text-black tracking-tight">项目设置</h2>
        <p className="text-slate-500 text-[15px]">管理您的技能库数据存储和系统核心配置。</p>
      </div>

      {/* Storage Configuration */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[18px] font-bold text-black">存储设置</h3>
          {isSaved && (
            <div className="flex items-center gap-1.5 text-green-600 text-[12px] font-medium animate-in fade-in slide-in-from-right-2">
              <CheckCircle2 size={14} />
              已自动保存
            </div>
          )}
        </div>
        
        <div className="vercel-border bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-[#eaeaea]">
          <div className="p-6 space-y-5">
            <div className="flex flex-col space-y-1.5">
              <label className="text-[13px] font-bold text-black flex items-center gap-2">
                <Folder size={14} className="text-slate-400" />
                本地中心库路径 (Manager Store)
              </label>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                所有技能的原始文件将保存在此目录下。在 macOS 上默认为 <code className="bg-slate-100 px-1 rounded text-black font-medium">~/.skillsm</code>。
              </p>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 bg-[#fafafa] border border-[#eaeaea] rounded-lg px-4 py-2.5 focus-within:border-black focus-within:bg-white transition-all">
                <input 
                  type="text" 
                  value={storagePath}
                  onChange={handlePathChange}
                  className="bg-transparent border-none focus:ring-0 text-[13px] mono text-black w-full placeholder-slate-400"
                  placeholder="例如: ~/.skillsm"
                  aria-label="本地中心库路径"
                  name="managerStorePath"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <button 
                onClick={() => {
                  resetSettings();
                  setIsSaved(true);
                  setTimeout(() => setIsSaved(false), 2000);
                }}
                className="px-4 py-2 bg-white border border-[#eaeaea] hover:border-black rounded-lg text-slate-500 hover:text-black transition-all flex items-center gap-2 text-[13px] font-semibold shadow-sm"
                title="恢复默认路径"
              >
                <RotateCcw size={14} />
                <span>恢复默认</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex flex-col space-y-1.5">
              <label className="text-[13px] font-bold text-black flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                垃圾箱自动清空天数
              </label>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                技能移入垃圾箱后保留的天数。超过期限将自动清理（可在垃圾箱页面查看）。
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex-1">
                <input
                  type="range"
                  min="1"
                  max="90"
                  value={recycleBinRetentionDays}
                  onChange={(e) => handleRetentionChange(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-black"
                  aria-label="垃圾箱自动清空天数"
                />
                <div className="flex justify-between mt-2 text-[11px] font-bold text-slate-300 mono">
                  <span>1 天</span>
                  <span>45 天</span>
                  <span>90 天</span>
                </div>
              </div>
              <div className="w-20 px-3 py-2 bg-[#fafafa] vercel-border rounded-lg text-center">
                <span className="text-[14px] font-bold text-black mono">{recycleBinRetentionDays}</span>
                <span className="text-[10px] ml-1 text-slate-400 font-bold">D</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="space-y-4">
        <h3 className="text-[18px] font-bold text-black px-1">数据管理</h3>
        <div className="vercel-border bg-white rounded-xl overflow-hidden divide-y divide-[#eaeaea] shadow-sm">
          <div className="p-6 flex items-center justify-between group">
            <div className="space-y-1">
              <h4 className="text-[14px] font-bold text-black flex items-center gap-2">
                <Download size={14} className="text-slate-400" />
                导出配置备份
              </h4>
              <p className="text-[12px] text-slate-400">下载当前技能列表及 Agent 映射关系的备份文件 (JSON)。</p>
            </div>
            <button className="bg-white border border-[#eaeaea] hover:border-black text-black px-5 py-2 rounded-lg text-[13px] font-bold transition-all shadow-sm">
              导出备份
            </button>
          </div>

          <div className="p-6 flex items-center justify-between group">
            <div className="space-y-1">
              <h4 className="text-[14px] font-bold text-red-600 flex items-center gap-2">
                <Trash2 size={14} className="text-red-400" />
                危险区域：重置所有数据
              </h4>
              <p className="text-[12px] text-slate-400">永久删除所有已安装技能、日志和 Agent 配置。此操作不可撤销。</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="bg-white text-red-600 border border-red-100 hover:border-red-600 px-5 py-2 rounded-lg text-[13px] font-bold hover:bg-red-50 transition-all">
                  彻底重置
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="vercel-border bg-white">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-black">确认重置所有数据？</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500">
                    将永久删除所有已安装技能、日志和 Agent 配置，此操作不可撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="vercel-border">取消</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => void handleResetData()}
                  >
                    彻底重置
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>

      {/* Privacy Note */}
      <section className="p-8 bg-slate-50 border border-slate-200 rounded-2xl border-dashed">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-white vercel-border flex items-center justify-center text-black shadow-sm">
            <Info size={22} />
          </div>
          <div className="space-y-2">
            <h4 className="text-[15px] font-bold text-black">本地优先与隐私保护</h4>
            <p className="text-[13px] text-slate-500 max-w-lg leading-relaxed">
              Skills Manager 采用完全本地化的运行模式。您的 Agent 路径、技能源码和配置信息仅存储在您的设备上，绝不上传云端，确保极客级的隐私安全。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
