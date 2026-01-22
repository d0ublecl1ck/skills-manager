
import { create } from 'zustand';

interface UIState {
  isFeedbackModalOpen: boolean;
  setFeedbackModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isFeedbackModalOpen: false,
  setFeedbackModalOpen: (open: boolean) => set({ isFeedbackModalOpen: open }),
}));

