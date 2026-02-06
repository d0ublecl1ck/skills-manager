
import React, { useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useAgentStore } from '../stores/useAgentStore';
import { detectStartupUntrackedSkills, syncSelectedSkillsToManagerStore } from '../services/syncService';
import { getEffectiveAgents } from '../services/effectiveAgents';
import { Zap, Search, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

const OnboardingModal: React.FC = () => {
  const { hasCompletedOnboarding, setHasCompletedOnboarding } = useSettingsStore();
  const addLog = useSkillStore(state => state.addLog);
  const mergeSkills = useSkillStore(state => state.mergeSkills);
  const agents = useAgentStore(state => state.agents);
  const [isScanning, setIsScanning] = useState(false);

  if (hasCompletedOnboarding) return null;

  const handleStartScan = async () => {
    setIsScanning(true);
    const startedAt = Date.now();

    try {
      const effectiveAgents = getEffectiveAgents(agents);
      const detected = await detectStartupUntrackedSkills(effectiveAgents);
      const skills = await syncSelectedSkillsToManagerStore(
        effectiveAgents,
        detected.map((skill) => skill.name),
      );
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 2500 - elapsed);

      setTimeout(() => {
        mergeSkills(skills);
        addLog({
          action: 'sync',
          skillId: '系统初始化',
          status: 'success',
          message: `首次全面扫描完成，已自动识别 ${skills.length} 个潜在技能。`
        });
        setHasCompletedOnboarding(true);
        setIsScanning(false);
      }, remaining);
    } catch (e) {
      console.error(e);
      addLog({
        action: 'sync',
        skillId: '系统初始化',
        status: 'error',
        message: `首次全面扫描失败: ${e instanceof Error ? e.message : '未知错误'}`
      });
      setHasCompletedOnboarding(true);
      setIsScanning(false);
    }
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-md animate-in fade-in duration-500" />
      
      {/* Content */}
      <div className="relative w-full max-w-[520px] bg-white vercel-border rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.12)] overflow-hidden animate-in zoom-in-95 fade-in duration-500">
        <div className="p-8 sm:p-10 space-y-8">
          {/* Header Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/10">
              <Zap size={32} fill="currentColor" />
            </div>
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-[24px] font-bold text-black tracking-tight">欢迎使用 Skills Manager</h2>
            <p className="text-[15px] text-slate-500 leading-relaxed max-w-[360px] mx-auto">
              检测到您可能是首次运行。是否立即扫描本地 Agent 目录，将现有的技能资产纳入统一管理？
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="mt-1 text-black"><Search size={18} /></div>
              <div>
                <div className="text-[13px] font-bold text-black">全自动路径扫描</div>
                <div className="text-[12px] text-slate-500">扫描 Claude, Cursor, OpenCode 等工具的默认技能目录。</div>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="mt-1 text-black"><ShieldCheck size={18} /></div>
              <div>
                <div className="text-[13px] font-bold text-black">无损纳入管理</div>
                <div className="text-[12px] text-slate-500">仅建立本地索引和链接，不修改您的原始代码文件。</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={handleStartScan}
              disabled={isScanning}
              className="w-full bg-black text-white h-12 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-black/5 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  正在深度扫描本地目录...
                </>
              ) : (
                <>
                  立即全面扫描并同步
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            {!isScanning && (
              <button 
                onClick={handleSkip}
                className="w-full h-12 text-slate-400 hover:text-black text-[13px] font-medium transition-colors"
              >
                以后再说，我自己手动添加
              </button>
            )}
          </div>
        </div>
        
        {/* Progress Bar (Only during scan) */}
        {isScanning && (
          <div className="h-1 bg-slate-100 w-full overflow-hidden">
            <div className="h-full bg-black animate-[loading_2.5s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

export default OnboardingModal;
