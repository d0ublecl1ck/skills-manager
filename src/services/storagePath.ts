import { useSettingsStore } from '../stores/useSettingsStore';

export const storagePath = () => useSettingsStore.getState().storagePath;
