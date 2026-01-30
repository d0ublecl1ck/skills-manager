
import { create } from 'zustand';
import type { AgentId } from '../types';

interface UIState {
  isFeedbackModalOpen: boolean;
  setFeedbackModalOpen: (open: boolean) => void;
  isSyncModalOpen: boolean;
  setSyncModalOpen: (open: boolean) => void;
  isUpdateAllModalOpen: boolean;
  setUpdateAllModalOpen: (open: boolean) => void;
  isDevModalOpen: boolean;
  setDevModalOpen: (open: boolean) => void;
  isDistributionModalOpen: boolean;
  distributionAgentId: AgentId | null;
  distributionAgentName: string;
  openDistributionModal: (agentId: AgentId, agentName: string) => void;
  closeDistributionModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isFeedbackModalOpen: false,
  setFeedbackModalOpen: (open: boolean) => set({ isFeedbackModalOpen: open }),
  isSyncModalOpen: false,
  setSyncModalOpen: (open: boolean) => set({ isSyncModalOpen: open }),
  isUpdateAllModalOpen: false,
  setUpdateAllModalOpen: (open: boolean) => set({ isUpdateAllModalOpen: open }),
  isDevModalOpen: false,
  setDevModalOpen: (open: boolean) => set({ isDevModalOpen: open }),
  isDistributionModalOpen: false,
  distributionAgentId: null,
  distributionAgentName: '',
  openDistributionModal: (agentId: AgentId, agentName: string) =>
    set({ isDistributionModalOpen: true, distributionAgentId: agentId, distributionAgentName: agentName }),
  closeDistributionModal: () => set({ isDistributionModalOpen: false, distributionAgentId: null, distributionAgentName: '' }),
}));
