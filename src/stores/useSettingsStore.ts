import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  storagePath: string;
  hasCompletedOnboarding: boolean;
  setStoragePath: (path: string) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      storagePath: '~/.skillsm',
      hasCompletedOnboarding: false,
      setStoragePath: (path) => set({ storagePath: path }),
      setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
      resetSettings: () =>
        set({
          storagePath: '~/.skillsm',
          hasCompletedOnboarding: false,
        }),
    }),
    { name: 'settings-manager-storage-v1' },
  ),
);

