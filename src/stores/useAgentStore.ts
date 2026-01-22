
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AgentInfo, AgentId } from '../types';
import { DEFAULT_AGENTS } from '../constants';

interface AgentState {
  agents: AgentInfo[];
  updateAgentPath: (id: AgentId, path: string) => void;
  toggleAgentEnabled: (id: AgentId) => void;
  resetToDefaults: () => void;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      agents: DEFAULT_AGENTS,
      updateAgentPath: (id, path) => set((state) => ({
        agents: state.agents.map((a) => a.id === id ? { ...a, currentPath: path } : a)
      })),
      toggleAgentEnabled: (id) => set((state) => ({
        agents: state.agents.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a)
      })),
      resetToDefaults: () => set({ agents: DEFAULT_AGENTS }),
    }),
    { name: 'agents-manager-storage' }
  )
);

