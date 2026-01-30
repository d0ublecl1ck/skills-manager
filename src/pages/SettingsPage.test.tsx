import { invoke } from '@tauri-apps/api/core';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SettingsPage from './SettingsPage';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useToastStore } from '../stores/useToastStore';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
    window.localStorage.clear();
    useSettingsStore.setState({
      storagePath: '~/.skillsm',
      hasCompletedOnboarding: true,
      recycleBinRetentionDays: 15,
    });
    useToastStore.getState().clearToasts();
  });

  afterEach(() => {
    cleanup();
  });

  it('点击中心库路径会打开选择器并二次确认迁移', async () => {
    vi.mocked(invoke).mockImplementation((cmd, args) => {
      if (cmd === 'select_manager_store_directory') return Promise.resolve('/tmp/skillsm' as never);
      if (cmd === 'migrate_manager_store') {
        expect(args).toEqual({ fromStoragePath: '~/.skillsm', toStoragePath: '/tmp/skillsm' });
        return Promise.resolve(undefined as never);
      }
      return Promise.resolve(undefined as never);
    });

    render(<SettingsPage />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('本地中心库路径'));
    expect(await screen.findByText('确认迁移中心库？')).toBeInTheDocument();

    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '确认迁移' }));

    await waitFor(() => {
      expect(vi.mocked(invoke)).toHaveBeenCalledWith('migrate_manager_store', {
        fromStoragePath: '~/.skillsm',
        toStoragePath: '/tmp/skillsm',
      });
    });

    expect(screen.getByLabelText('本地中心库路径')).toHaveValue('/tmp/skillsm');
    expect(useToastStore.getState().toasts[0]?.message).toBe('中心库迁移完成');
  });

  it('取消二次确认不会触发迁移', async () => {
    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === 'select_manager_store_directory') return Promise.resolve('/tmp/skillsm' as never);
      return Promise.resolve(undefined as never);
    });

    render(<SettingsPage />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('本地中心库路径'));
    expect(await screen.findByText('确认迁移中心库？')).toBeInTheDocument();

    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: '取消' }));

    expect(vi.mocked(invoke)).not.toHaveBeenCalledWith('migrate_manager_store', expect.anything());
    expect(screen.getByLabelText('本地中心库路径')).toHaveValue('~/.skillsm');
  });
});
