import React from 'react';
import { Trash2, RotateCcw, AlertTriangle, Calendar, Clock } from 'lucide-react';

import { useSkillStore } from '../stores/useSkillStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { addDaysByRetentionPolicy, formatLocalDateTimeToMinute, isValidDate } from '../lib/datetime';
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

const RecycleBinPage: React.FC = () => {
  const recycleBin = useSkillStore((state) => state.recycleBin);
  const restoreSkill = useSkillStore((state) => state.restoreSkill);
  const permanentlyDeleteSkill = useSkillStore((state) => state.permanentlyDeleteSkill);
  const emptyRecycleBin = useSkillStore((state) => state.emptyRecycleBin);
  const retentionDays = useSettingsStore((state) => state.recycleBinRetentionDays);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-[32px] font-bold text-black tracking-tight leading-none">垃圾箱</h2>
          <p className="text-slate-500 text-[15px]">
            查看并管理已删除的技能，支持还原或彻底粉碎。
          </p>
        </div>
        {recycleBin.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="bg-white border border-red-200 text-red-500 hover:bg-red-50 px-5 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2">
                <Trash2 size={16} />
                清空垃圾箱
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="vercel-border bg-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-black">确认清空垃圾箱？</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-500">
                  垃圾箱内的技能将被彻底粉碎，此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="vercel-border">取消</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={emptyRecycleBin}
                >
                  清空
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-4">
        <div className="pt-0.5">
          <AlertTriangle size={18} className="text-amber-500" />
        </div>
        <p className="text-[13px] text-amber-700 leading-relaxed">
          <span className="font-bold">注意：</span>
          垃圾箱中的技能默认保留 {retentionDays} 天，超过期限后将自动清理。
        </p>
      </div>

      {recycleBin.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recycleBin.map((skill) => (
            <div
              key={skill.id}
              className="bg-white border border-[#eaeaea] rounded-xl p-6 flex flex-col h-full opacity-80 hover:opacity-100 transition-opacity"
            >
              <div className="flex-1">
                <h3 className="text-[16px] font-bold text-slate-800 mb-2">{skill.name}</h3>
                <div className="text-[12px] text-slate-400 mono mb-4">{skill.id}</div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                  <Calendar size={12} />
                  <span>
                    删除于:{' '}
                    {skill.deletedAt ? new Date(skill.deletedAt).toLocaleDateString() : '未知'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-6">
                  <Clock size={12} />
                  <span>
                    将于:{' '}
                    {(() => {
                      if (!skill.deletedAt) return '未知';
                      const deletedAt = new Date(skill.deletedAt);
                      if (!isValidDate(deletedAt)) return '未知';
                      const purgeAt = addDaysByRetentionPolicy(deletedAt, retentionDays);
                      return formatLocalDateTimeToMinute(purgeAt);
                    })()}{' '}
                    彻底删除
                  </span>
                </div>
              </div>

              <div className="h-px bg-[#f3f3f3] w-full mb-4"></div>

              <div className="flex gap-2 items-center">
                <button
                  onClick={() => restoreSkill(skill.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-slate-100 border border-[#eaeaea] rounded-lg text-[12px] font-bold text-slate-700 transition-colors"
                >
                  <RotateCcw size={14} />
                  还原
                </button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="px-3 py-2 text-slate-300 hover:text-red-500 transition-colors"
                      title="彻底粉碎"
                      aria-label="彻底粉碎"
                    >
                      <Trash2 size={16} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="vercel-border bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-black">确认彻底粉碎？</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-500">
                        将从中心库删除 <span className="mono text-black">{skill.name}</span> 的文件，并清理所有平台目录。此操作无法撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="vercel-border">取消</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 text-white hover:bg-red-700"
                        onClick={() => permanentlyDeleteSkill(skill.id)}
                      >
                        彻底粉碎
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {skill.sourceUrl && (
                <div className="mt-6 flex items-center justify-end">
                  <a
                    href={skill.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-slate-300 hover:text-black transition-colors underline decoration-slate-200"
                  >
                    源码
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-40 border border-dashed border-[#eaeaea] rounded-xl bg-white">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 vercel-border">
            <Trash2 size={24} className="text-slate-300" />
          </div>
          <p className="text-[14px] font-medium text-slate-500">垃圾箱空空如也。</p>
        </div>
      )}
    </div>
  );
};

export default RecycleBinPage;
