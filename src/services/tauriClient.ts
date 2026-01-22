
import { invoke } from '@tauri-apps/api/core';
import type { AgentInfo, Skill } from '../types';

export const bootstrapSkillsStore = async (skills: Skill[]) => {
  await invoke('bootstrap_skills_store', { skills });
};

export const installSkill = async (repoUrl: string): Promise<Skill> => {
  return await invoke<Skill>('install_skill', { repoUrl });
};

export const syncSkillDistribution = async (skill: Skill, agents: AgentInfo[]) => {
  await invoke('sync_skill_distribution', {
    skillId: skill.id,
    skillName: skill.name,
    enabledAgents: skill.enabledAgents,
    agents,
  });
};

export const syncAllSkillsDistribution = async (skills: Skill[], agents: AgentInfo[]) => {
  await invoke('sync_all_skills_distribution', { skills, agents });
};

export const uninstallSkill = async (skill: Skill, agents: AgentInfo[]) => {
  await invoke('uninstall_skill', {
    skillId: skill.id,
    skillName: skill.name,
    agents,
  });
};

export const resetStore = async () => {
  await invoke('reset_store');
};

