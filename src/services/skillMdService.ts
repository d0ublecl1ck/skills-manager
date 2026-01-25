import { invoke } from '@tauri-apps/api/core';
import { storagePath } from './storagePath';

export const getSkillDescriptionFromMd = async (skillName: string): Promise<string | null> => {
  const res = await invoke<unknown>('get_skill_description', {
    skillName,
    storagePath: storagePath(),
  });

  return typeof res === 'string' && res.trim() ? res : null;
};

