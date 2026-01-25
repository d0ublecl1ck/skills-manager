
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Skill, AgentId, OperationLog } from '../types';
import { reinstallSkill, uninstallSkill } from '../services/skillService';
import { syncSkillDistribution } from '../services/syncService';
import { useAgentStore } from './useAgentStore';
import { useSettingsStore } from './useSettingsStore';

interface SkillState {
  skills: Skill[];
  recycleBin: Skill[];
  logs: OperationLog[];
  setSkills: (skills: Skill[]) => void;
  mergeSkills: (skills: Skill[]) => void;
  addSkill: (skill: Skill) => void;
  removeSkill: (skillId: string) => void;
  restoreSkill: (skillId: string) => void;
  permanentlyDeleteSkill: (skillId: string) => void;
  emptyRecycleBin: () => void;
  cleanExpiredTrash: () => void;
  updateSkill: (skillId: string, updates: Partial<Skill>) => void;
  toggleAgent: (skillId: string, agentId: AgentId) => void;
  setSkillAgents: (skillId: string, agentIds: AgentId[]) => void;
  addLog: (log: Omit<OperationLog, 'id' | 'timestamp'>) => void;
  adoptSkill: (skillId: string, updates: Pick<Skill, 'sourceUrl' | 'enabledAgents'> & Partial<Skill>) => void;
  reInstallSkill: (skillId: string) => Promise<void>;
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
    (set, get) => ({
      skills: INITIAL_SKILLS,
      recycleBin: [],
      logs: [],
      setSkills: (skills) =>
        set({
          skills: skills.map((s) => {
            const installSource = s.installSource ?? (s.sourceUrl ? 'platform' : 'external');
            return { ...s, installSource, isAdopted: s.isAdopted ?? (installSource === 'platform') };
          }),
        }),
      mergeSkills: (incoming) => set((state) => {
        const deriveInstallSource = (s: Skill): Skill['installSource'] =>
          s.installSource ?? (s.sourceUrl ? 'platform' : 'external');

        const incomingByName = new Map(incoming.map((s) => [s.name, s]));
        const merged = state.skills.map((existing) => {
          const next = incomingByName.get(existing.name);
          if (!next) return existing;
          incomingByName.delete(existing.name);

          const existingInstallSource = deriveInstallSource(existing);
          const nextInstallSource = existingInstallSource ?? deriveInstallSource(next);
          const isAdopted = existing.isAdopted ?? (nextInstallSource === 'platform');

          return {
            ...existing,
            enabledAgents: Array.from(new Set([...existing.enabledAgents, ...next.enabledAgents])),
            lastSync: next.lastSync ?? existing.lastSync,
            lastUpdate: next.lastUpdate ?? existing.lastUpdate,
            sourceUrl: existing.sourceUrl ?? next.sourceUrl,
            installSource: nextInstallSource,
            isAdopted,
          };
        });
        for (const next of incomingByName.values()) {
          const installSource = deriveInstallSource(next);
          merged.push({
            ...next,
            installSource,
            isAdopted: next.isAdopted ?? (installSource === 'platform'),
          });
        }
        return { skills: merged };
      }),
      addSkill: (skill) =>
        set((state) => {
          const installSource = skill.installSource ?? (skill.sourceUrl ? 'platform' : 'external');
          return {
            skills: [
              ...state.skills,
              { ...skill, installSource, isAdopted: skill.isAdopted ?? (installSource === 'platform') },
            ],
          };
        }),
      removeSkill: (skillId) => set((state) => {
        const skill = state.skills.find((s) => s.id === skillId);
        if (!skill) return state;

        void syncSkillDistribution(
          { ...skill, enabledAgents: [] },
          useAgentStore.getState().agents,
        ).catch(console.error);

        return {
          skills: state.skills.filter((s) => s.id !== skillId),
          recycleBin: [...state.recycleBin, { ...skill, deletedAt: new Date().toISOString() }],
        };
      }),
      restoreSkill: (skillId) => set((state) => {
        const skill = state.recycleBin.find((s) => s.id === skillId);
        if (!skill) return state;

        const restored: Skill = { ...skill };
        delete restored.deletedAt;

        void syncSkillDistribution(restored, useAgentStore.getState().agents).catch(console.error);

        return {
          recycleBin: state.recycleBin.filter((s) => s.id !== skillId),
          skills: [...state.skills, restored],
        };
      }),
      permanentlyDeleteSkill: (skillId) => {
        const skill = get().recycleBin.find((s) => s.id === skillId);
        if (skill) {
          void uninstallSkill(skill, useAgentStore.getState().agents).catch(console.error);
        }
        set((state) => ({ recycleBin: state.recycleBin.filter((s) => s.id !== skillId) }));
      },
      emptyRecycleBin: () => {
        const recycleBin = get().recycleBin;
        if (recycleBin.length > 0) {
          for (const skill of recycleBin) {
            void uninstallSkill(skill, useAgentStore.getState().agents).catch(console.error);
          }
        }
        set({ recycleBin: [] });
      },
      cleanExpiredTrash: () => {
        const retentionDays = Math.max(1, useSettingsStore.getState().recycleBinRetentionDays);
        const now = Date.now();
        const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

        const expired: Skill[] = [];
        const recycleBin = get().recycleBin.filter((skill) => {
          if (!skill.deletedAt) return true;
          const deletedAt = new Date(skill.deletedAt).getTime();
          if (!Number.isFinite(deletedAt)) return true;
          const isExpired = now - deletedAt > retentionMs;
          if (isExpired) expired.push(skill);
          return !isExpired;
        });

        if (expired.length > 0) {
          for (const skill of expired) {
            void uninstallSkill(skill, useAgentStore.getState().agents).catch(console.error);
          }
        }

        set({ recycleBin });
      },
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
      adoptSkill: (skillId, updates) => set((state) => ({
        skills: state.skills.map((s) => {
          if (s.id !== skillId) return s;
          return {
            ...s,
            ...updates,
            installSource: 'platform',
            isAdopted: true,
          };
        }),
      })),
      reInstallSkill: async (skillId) => {
        const skill = get().skills.find((s) => s.id === skillId);
        if (!skill) throw new Error('Skill not found');
        if (!skill.sourceUrl) throw new Error('该技能尚未关联源码，无法覆盖更新');

        const updated = await reinstallSkill({
          id: skill.id,
          name: skill.name,
          sourceUrl: skill.sourceUrl,
          enabledAgents: skill.enabledAgents,
        });

        set((state) => ({
          skills: state.skills.map((s) =>
            s.id === skillId
              ? {
                  ...s,
                  lastSync: updated.lastSync ?? s.lastSync,
                  lastUpdate: updated.lastUpdate ?? s.lastUpdate,
                  sourceUrl: updated.sourceUrl ?? s.sourceUrl,
                  installSource: 'platform',
                  isAdopted: true,
                }
              : s,
          ),
        }));

        const next = get().skills.find((s) => s.id === skillId);
        if (next) {
          await syncSkillDistribution(next, useAgentStore.getState().agents);
        }
      },
    }),
    {
      name: 'skills-manager-storage',
      version: 3,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== 'object') {
          return { skills: INITIAL_SKILLS, recycleBin: [], logs: [] };
        }
        const state = persisted as { skills?: Skill[]; recycleBin?: Skill[]; logs?: OperationLog[] };
        const withInstallSource = (skill: Skill): Skill => {
          const installSource = skill.installSource ?? (skill.sourceUrl ? 'platform' : 'external');
          return {
            ...skill,
            installSource,
            isAdopted: skill.isAdopted ?? (installSource === 'platform'),
          };
        };
        const skills = Array.isArray(state.skills)
          ? state.skills.filter(
              (s) => !REMOVED_DEMO_SKILL_IDS.has(s.id) && !REMOVED_DEMO_SKILL_NAMES.has(s.name),
            )
          : INITIAL_SKILLS;
        const normalizedSkills = skills.map((skill) => ({
          ...withInstallSource(skill),
          id: skill.id,
          name: skill.name,
          sourceUrl: skill.sourceUrl,
          enabledAgents: Array.isArray(skill.enabledAgents) ? skill.enabledAgents : [],
          lastSync: skill.lastSync,
          lastUpdate: skill.lastUpdate,
          deletedAt: skill.deletedAt,
        }));
        const recycleBin = Array.isArray(state.recycleBin)
          ? state.recycleBin
              .filter((s) => !REMOVED_DEMO_SKILL_IDS.has(s.id) && !REMOVED_DEMO_SKILL_NAMES.has(s.name))
              .map((skill) => ({
                ...withInstallSource(skill),
                id: skill.id,
                name: skill.name,
                sourceUrl: skill.sourceUrl,
                enabledAgents: Array.isArray(skill.enabledAgents) ? skill.enabledAgents : [],
                lastSync: skill.lastSync,
                lastUpdate: skill.lastUpdate,
                deletedAt: skill.deletedAt,
              }))
          : [];
        const logs = Array.isArray(state.logs) ? state.logs : [];
        return { ...state, skills: normalizedSkills, recycleBin, logs };
      },
      onRehydrateStorage: () => {
        return (nextState, error) => {
          if (nextState && !error) nextState.cleanExpiredTrash();
        };
      },
    }
  )
);
