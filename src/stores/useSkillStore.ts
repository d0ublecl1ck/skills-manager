
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Skill, AgentId, OperationLog } from '../types';
import { syncSkillDistribution, uninstallSkill } from '../services/tauriClient';
import { useAgentStore } from './useAgentStore';

interface SkillState {
  skills: Skill[];
  logs: OperationLog[];
  addSkill: (skill: Skill) => void;
  removeSkill: (skillId: string) => void;
  updateSkill: (skillId: string, updates: Partial<Skill>) => void;
  toggleAgent: (skillId: string, agentId: AgentId) => void;
  setSkillAgents: (skillId: string, agentIds: AgentId[]) => void;
  addLog: (log: Omit<OperationLog, 'id' | 'timestamp'>) => void;
}

const INITIAL_SKILLS: Skill[] = [
  {
    id: '1',
    name: 'Git Workflow Helper',
    description: '自动生成提交信息、分支建议并帮助管理 Pull Requests。',
    author: 'SkillsManager Team',
    source: 'github',
    sourceUrl: 'https://github.com/skills-manager/git-helper',
    tags: ['git', 'productivity', 'automation'],
    enabledAgents: [AgentId.OPENCODE, AgentId.CLAUDE_CODE, AgentId.CODEX, AgentId.CURSOR, AgentId.AMP, AgentId.ANTIGRAVITY, AgentId.CLINE, AgentId.COPILOT],
    isAdopted: true,
    lastSync: '2025-01-22T10:00:00Z'
  },
  {
    id: '2',
    name: 'Rust Analyzer Pro',
    description: '深度分析 Rust 代码质量并提供优化建议。',
    author: 'rust-lang-enthusiast',
    source: 'local',
    tags: ['rust', 'analysis'],
    enabledAgents: [AgentId.CURSOR, AgentId.CODEX, AgentId.CLINE, AgentId.COPILOT],
    isAdopted: true,
    lastSync: '2025-01-21T15:30:00Z'
  },
  {
    id: '3',
    name: 'Tailwind CSS IntelliSense',
    description: '为 AI Agent 提供更准确的样式补全和设计系统建议。',
    author: 'style-ninja',
    source: 'github',
    tags: ['ui', 'tailwind', 'css'],
    enabledAgents: [AgentId.CURSOR, AgentId.OPENCODE, AgentId.CLINE, AgentId.COPILOT],
    isAdopted: true,
    lastSync: '2025-01-22T08:00:00Z'
  }
];

export const useSkillStore = create<SkillState>()(
  persist(
    (set) => ({
      skills: INITIAL_SKILLS,
      logs: [],
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
    { name: 'skills-manager-storage' }
  )
);
