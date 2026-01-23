
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AgentInfo, Skill } from '../types';
import { useSettingsStore } from '../stores/useSettingsStore';

const storagePath = () => useSettingsStore.getState().storagePath;

export const bootstrapSkillsStore = async (skills: Skill[]) => {
  await invoke('bootstrap_skills_store', { skills, storagePath: storagePath() });
};

export const installSkill = async (repoUrl: string): Promise<Skill> => {
  return await invoke<Skill>('install_skill', { repoUrl, storagePath: storagePath() });
};

export const syncSkillDistribution = async (skill: Skill, agents: AgentInfo[]) => {
  await invoke('sync_skill_distribution', {
    skillId: skill.id,
    skillName: skill.name,
    enabledAgents: skill.enabledAgents,
    agents,
    storagePath: storagePath(),
  });
};

export const syncAllSkillsDistribution = async (skills: Skill[], agents: AgentInfo[]) => {
  await invoke('sync_all_skills_distribution', { skills, agents, storagePath: storagePath() });
};

export const uninstallSkill = async (skill: Skill, agents: AgentInfo[]) => {
  await invoke('uninstall_skill', {
    skillId: skill.id,
    skillName: skill.name,
    agents,
    storagePath: storagePath(),
  });
};

export const resetStore = async () => {
  await invoke('reset_store', { storagePath: storagePath() });
};

export const syncAllToManagerStore = async (agents: AgentInfo[]): Promise<Skill[]> => {
  return await invoke<Skill[]>('sync_all_to_manager_store', { agents, storagePath: storagePath() });
};

export type SyncAllToManagerProgressLog = {
  id: string;
  label: string;
  status: 'loading' | 'success' | 'error';
  progress: number;
};

export const syncAllToManagerStoreWithProgress = async (
  agents: AgentInfo[],
  onProgress: (log: SyncAllToManagerProgressLog) => void,
): Promise<Skill[]> => {
  const unlisten = await listen<SyncAllToManagerProgressLog>(
    'sync_all_to_manager_store:progress',
    (event) => onProgress(event.payload),
  );

  try {
    return await invoke<Skill[]>('sync_all_to_manager_store_with_progress', {
      agents,
      storagePath: storagePath(),
    });
  } finally {
    unlisten();
  }
};
