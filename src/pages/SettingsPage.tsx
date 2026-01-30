
import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Info, Folder, RotateCcw, Download, Trash2, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useToastStore } from '../stores/useToastStore';
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
    recycleBinRetentionDays,
    setRecycleBinRetentionDays,
  } = useSettingsStore();
  const addToast = useToastStore((s) => s.addToast);
  const [isSaved, setIsSaved] = useState(false);
  const [pendingStoragePath, setPendingStoragePath] = useState<string | null>(null);
  const [isConfirmMigrationOpen, setIsConfirmMigrationOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const requestMigration = (nextPath: string) => {
    const trimmed = nextPath.trim();
    if (!trimmed) {
      addToast('路径不能为空', 'error');
      return;
    }
    if (trimmed === storagePath.trim()) return;

    setPendingStoragePath(trimmed);
    setIsConfirmMigrationOpen(true);
  };

  const handlePickStoragePath = async () => {
    if (isMigrating) return;

    try {
      const selected = await invoke<string | null>('select_manager_store_directory');
      if (!selected) return;
      requestMigration(selected);
    } catch (e) {
      console.error(e);
      addToast(`打开文件夹选择器失败: ${e instanceof Error ? e.message : '未知错误'}`, 'error', 5000);
    }
  };

  const handleConfirmMigration = async () => {
    if (!pendingStoragePath) return;

    setIsMigrating(true);
    try {
      await invoke('migrate_manager_store', {
        fromStoragePath: storagePath,
        toStoragePath: pendingStoragePath,
      });
      setStoragePath(pendingStoragePath);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      addToast('中心库迁移完成', 'success');
    } catch (e) {
      console.error(e);
      addToast(`中心库迁移失败: ${e instanceof Error ? e.message : '未知错误'}`, 'error', 6000);
    } finally {
      setIsMigrating(false);
      setIsConfirmMigrationOpen(false);
      setPendingStoragePath(null);
    }
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
      {isMigrating && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/70 backdrop-blur-md animate-in fade-in duration-200" />
          <div className="relative w-full max-w-sm bg-white vercel-border rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.1)] overflow-hidden">
            <div className="p-6 flex items-center gap-3">
              <Loader2 size={18} className="text-black animate-spin" />
              <div className="space-y-1">
                <div className="text-[14px] font-bold text-black">正在迁移中心库…</div>
                <div className="text-[12px] text-slate-500">请勿关闭程序，等待文件移动完成。</div>
              </div>
            </div>
            <div className="h-1 bg-slate-100">
              <div className="h-full bg-black animate-pulse w-2/5" />
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={isConfirmMigrationOpen} onOpenChange={setIsConfirmMigrationOpen}>
        <AlertDialogContent className="vercel-border bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-black">确认迁移中心库？</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              将把当前中心库目录内的文件移动到新目录。此过程可能需要一些时间。
            </AlertDialogDescription>
            <div className="mt-1 space-y-1 text-[12px]">
              <div>
                <span className="text-slate-400">当前：</span>
                <span className="mono text-black">{storagePath}</span>
              </div>
              <div>
                <span className="text-slate-400">目标：</span>
                <span className="mono text-black">{pendingStoragePath ?? ''}</span>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="vercel-border"
              disabled={isMigrating}
              onClick={() => setPendingStoragePath(null)}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-black text-white hover:bg-slate-800"
              disabled={isMigrating}
              onClick={() => void handleConfirmMigration()}
            >
              {isMigrating ? '迁移中...' : '确认迁移'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  readOnly
                  onClick={() => void handlePickStoragePath()}
                  className="bg-transparent border-none focus:ring-0 text-[13px] mono text-black w-full placeholder-slate-400 cursor-pointer"
                  placeholder="例如: ~/.skillsm"
                  aria-label="本地中心库路径"
                  name="managerStorePath"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <button 
                onClick={() => {
                  const next = '~/.skillsm';
                  requestMigration(next);
                }}
                disabled={isMigrating}
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
