import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { homeDir, join } from '@tauri-apps/api/path';

import SkillCard from './SkillCard';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { Skill } from '../types';

vi.mock('@tauri-apps/plugin-opener', () => ({
  revealItemInDir: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
  homeDir: vi.fn(async () => '/Users/test'),
  join: vi.fn(async (...parts: string[]) => parts.join('/')),
}));

describe('SkillCard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsStore.setState({ storagePath: '~/.skillsm', hasCompletedOnboarding: true });
    vi.mocked(revealItemInDir).mockClear();
    vi.mocked(homeDir).mockClear();
    vi.mocked(join).mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('点击卡片可打开对应技能目录', async () => {
    const skill: Skill = {
      id: 'test-skill',
      name: 'Test Skill',
      enabledAgents: [],
    };

    render(<SkillCard skill={skill} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('heading', { name: 'Test Skill' }));

    expect(vi.mocked(revealItemInDir)).toHaveBeenCalledWith(
      '/Users/test/.skillsm/Test Skill/SKILL.md',
    );
  });

  it('点击卡片内按钮不应打开目录', async () => {
    const skill: Skill = {
      id: 'test-skill',
      name: 'Test Skill',
      enabledAgents: [],
    };

    render(<SkillCard skill={skill} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '移入垃圾箱' }));
    expect(vi.mocked(revealItemInDir)).not.toHaveBeenCalled();
  });
});
