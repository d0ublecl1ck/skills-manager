import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, variant?: ToastVariant, durationMs?: number) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast: (message: string, variant: ToastVariant = 'info', durationMs = 3000) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [{ id, message, variant }, ...state.toasts].slice(0, 5) }));

    if (durationMs > 0) {
      window.setTimeout(() => {
        get().dismissToast(id);
      }, durationMs);
    }

    return id;
  },
  dismissToast: (id: string) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));

