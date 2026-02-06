import { invoke } from '@tauri-apps/api/core';
import type { AgentInfo, Skill } from '../types';
import { storagePath } from './storagePath';

export const bootstrapSkillsStore = async (skills: Skill[]): Promise<Skill[]> => {
  return await invoke<Skill[]>('bootstrap_skills_store', { skills, storagePath: storagePath() });
};

export const installSkill = async (repoUrl: string): Promise<Skill> => {
  return await invoke<Skill>('install_skill', { repoUrl, storagePath: storagePath() });
};

export const installSkillCli = async (repoUrl: string, skillName: string): Promise<Skill> => {
  return await invoke<Skill>('install_skill_cli', { repoUrl, skillName, storagePath: storagePath() });
};

export const reinstallSkill = async (
  skill: Pick<Skill, 'id' | 'name' | 'sourceUrl' | 'enabledAgents'>,
): Promise<Skill> => {
  if (!skill.sourceUrl) {
    throw new Error('sourceUrl is required to reinstall');
  }

  return await invoke<Skill>('reinstall_skill', {
    skillId: skill.id,
    skillName: skill.name,
    repoUrl: skill.sourceUrl,
    enabledAgents: skill.enabledAgents,
    storagePath: storagePath(),
  });
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
