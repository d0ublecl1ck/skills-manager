
import { create } from 'zustand';

interface UIState {
  isFeedbackModalOpen: boolean;
  setFeedbackModalOpen: (open: boolean) => void;
  isSyncModalOpen: boolean;
  setSyncModalOpen: (open: boolean) => void;
  isDevModalOpen: boolean;
  setDevModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isFeedbackModalOpen: false,
  setFeedbackModalOpen: (open: boolean) => set({ isFeedbackModalOpen: open }),
  isSyncModalOpen: false,
  setSyncModalOpen: (open: boolean) => set({ isSyncModalOpen: open }),
  isDevModalOpen: false,
  setDevModalOpen: (open: boolean) => set({ isDevModalOpen: open }),
}));
