import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  storagePath: string;
  hasCompletedOnboarding: boolean;
  recycleBinRetentionDays: number;
  setStoragePath: (path: string) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setRecycleBinRetentionDays: (days: number) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      storagePath: '~/.skillsm',
      hasCompletedOnboarding: false,
      recycleBinRetentionDays: 15,
      setStoragePath: (path) => set({ storagePath: path }),
      setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
      setRecycleBinRetentionDays: (days) => set({ recycleBinRetentionDays: days }),
      resetSettings: () =>
        set({
          storagePath: '~/.skillsm',
          hasCompletedOnboarding: false,
          recycleBinRetentionDays: 15,
        }),
    }),
    { name: 'settings-manager-storage-v1' },
  ),
);
