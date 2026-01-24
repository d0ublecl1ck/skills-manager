
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Skill, AgentId, OperationLog } from '../types';
import { syncSkillDistribution, uninstallSkill } from '../services/tauriClient';
import { useAgentStore } from './useAgentStore';

interface SkillState {
  skills: Skill[];
  logs: OperationLog[];
  setSkills: (skills: Skill[]) => void;
  mergeSkills: (skills: Skill[]) => void;
  addSkill: (skill: Skill) => void;
  removeSkill: (skillId: string) => void;
  updateSkill: (skillId: string, updates: Partial<Skill>) => void;
  toggleAgent: (skillId: string, agentId: AgentId) => void;
  setSkillAgents: (skillId: string, agentIds: AgentId[]) => void;
  addLog: (log: Omit<OperationLog, 'id' | 'timestamp'>) => void;
}

const INITIAL_SKILLS: Skill[] = [];
const REMOVED_DEMO_SKILL_NAMES = new Set([
  'Git Workflow Helper',
  'Rust Analyzer Pro',
  'Tailwind CSS IntelliSense',
]);
const REMOVED_DEMO_SKILL_IDS = new Set(['1', '2', '3']);

export const useSkillStore = create<SkillState>()(
  persist(
    (set) => ({
      skills: INITIAL_SKILLS,
      logs: [],
      setSkills: (skills) => set({ skills }),
      mergeSkills: (incoming) => set((state) => {
        const incomingByName = new Map(incoming.map((s) => [s.name, s]));
        const merged = state.skills.map((existing) => {
          const next = incomingByName.get(existing.name);
          if (!next) return existing;
          incomingByName.delete(existing.name);
          return {
            ...existing,
            enabledAgents: Array.from(new Set([...existing.enabledAgents, ...next.enabledAgents])),
            lastSync: next.lastSync ?? existing.lastSync,
            lastUpdate: next.lastUpdate ?? existing.lastUpdate,
          };
        });
        for (const next of incomingByName.values()) merged.push(next);
        return { skills: merged };
      }),
      addSkill: (skill) => set((state) => ({ skills: [...state.skills, skill] })),
      removeSkill: (skillId) => set((state) => {
        const skill = state.skills.find((s) => s.id === skillId);
        if (skill) {
          void uninstallSkill(skill, useAgentStore.getState().agents).catch(console.error);
        }
        return { skills: state.skills.filter((s) => s.id !== skillId) };
      }),
      updateSkill: (skillId, updates) => set((state) => ({
        skills: state.skills.map((s) => s.id === skillId ? { ...s, ...updates } : s)
      })),
      toggleAgent: (skillId, agentId) => set((state) => {
        const skills = state.skills.map((s) => {
          if (s.id !== skillId) return s;
          const enabled = s.enabledAgents.includes(agentId);
          const newAgents = enabled
            ? s.enabledAgents.filter((a) => a !== agentId)
            : [...s.enabledAgents, agentId];
          return { ...s, enabledAgents: newAgents };
        });

        const updated = skills.find((s) => s.id === skillId);
        if (updated) {
          void syncSkillDistribution(updated, useAgentStore.getState().agents).catch(console.error);
        }

        return { skills };
      }),
      setSkillAgents: (skillId, agentIds) => set((state) => {
        const skills = state.skills.map((s) => s.id === skillId ? { ...s, enabledAgents: agentIds } : s);

        const updated = skills.find((s) => s.id === skillId);
        if (updated) {
          void syncSkillDistribution(updated, useAgentStore.getState().agents).catch(console.error);
        }

        return { skills };
      }),
      addLog: (log) => set((state) => ({
        logs: [
          {
            ...log,
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString()
          },
          ...state.logs.slice(0, 49) // Keep last 50 logs
        ]
      })),
    }),
    {
      name: 'skills-manager-storage',
      version: 1,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') {
          return { skills: INITIAL_SKILLS, logs: [] };
        }
        const state = persisted as { skills?: Skill[]; logs?: OperationLog[] };
        const skills = Array.isArray(state.skills)
          ? state.skills.filter(
              (s) => !REMOVED_DEMO_SKILL_IDS.has(s.id) && !REMOVED_DEMO_SKILL_NAMES.has(s.name),
            )
          : INITIAL_SKILLS;
        const normalizedSkills = skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          sourceUrl: skill.sourceUrl,
          enabledAgents: Array.isArray(skill.enabledAgents) ? skill.enabledAgents : [],
          lastSync: skill.lastSync,
          lastUpdate: skill.lastUpdate,
        }));
        const logs = Array.isArray(state.logs) ? state.logs : [];
        return { ...state, skills: normalizedSkills, logs };
      },
    }
  )
);
