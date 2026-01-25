import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { AgentInfo, Skill } from '../types';
import { storagePath } from './storagePath';

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

export type SyncAllSkillsDistributionProgressLog = {
  id: string;
  label: string;
  status: 'loading' | 'success' | 'error';
  progress: number;
};

export const syncAllSkillsDistributionWithProgress = async (
  skills: Skill[],
  agents: AgentInfo[],
  onProgress: (log: SyncAllSkillsDistributionProgressLog) => void,
): Promise<void> => {
  const unlisten = await listen<SyncAllSkillsDistributionProgressLog>(
    'sync_all_skills_distribution:progress',
    (event) => onProgress(event.payload),
  );

  try {
    await invoke('sync_all_skills_distribution_with_progress', { skills, agents, storagePath: storagePath() });
  } finally {
    unlisten();
  }
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
