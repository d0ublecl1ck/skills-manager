import { homeDir, join } from '@tauri-apps/api/path';
import { revealItemInDir } from '@tauri-apps/plugin-opener';

const safeSkillDirName = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return 'skill';
  return trimmed.replace(/[\\/]/g, '-').replaceAll('..', '').trim() || 'skill';
};

export const resolveTildePath = async (path: string) => {
  const trimmed = path.trim();
  if (trimmed === '~') return await homeDir();

  if (trimmed.startsWith('~/') || trimmed.startsWith('~\\')) {
    const home = await homeDir();
    return await join(home, trimmed.slice(2));
  }

  return trimmed;
};

export const openSkillFolder = async (storagePath: string, skillName: string) => {
  const storeRoot = await resolveTildePath(storagePath);
  const skillDir = await join(storeRoot, safeSkillDirName(skillName));
  try {
    const skillMd = await join(skillDir, 'SKILL.md');
    await revealItemInDir(skillMd);
  } catch {
    await revealItemInDir(skillDir);
  }
};
