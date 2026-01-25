import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MarketplacePage from './MarketplacePage';
import { useAgentStore } from '../stores/useAgentStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useToastStore } from '../stores/useToastStore';
import { installSkillCli } from '../services/skillService';
import { syncSkillDistribution } from '../services/syncService';
import type { Skill } from '../types';
import { AgentId, type AgentInfo } from '../types';

vi.mock('../services/skillService', () => ({
  installSkillCli: vi.fn(),
}));

vi.mock('../services/syncService', () => ({
  syncAllSkillsDistribution: vi.fn(() => Promise.resolve()),
  syncAllSkillsDistributionWithProgress: vi.fn(() => Promise.resolve()),
  syncSkillDistribution: vi.fn(() => Promise.resolve()),
}));

const TEST_AGENTS: AgentInfo[] = [
  {
    id: AgentId.CODEX,
    name: 'Codex',
    defaultPath: '~/.codex/skills/',
    currentPath: '~/.codex/skills/',
    enabled: true,
    icon: 'codex',
  },
  {
    id: AgentId.CLAUDE_CODE,
    name: 'Claude Code',
    defaultPath: '~/.claude/skills/',
    currentPath: '~/.claude/skills/',
    enabled: true,
    icon: 'claudecode',
  },
];

describe('MarketplacePage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAgentStore.setState({ agents: TEST_AGENTS });
    useSkillStore.setState({ skills: [], recycleBin: [], logs: [] });
    useToastStore.getState().clearToasts();
    vi.mocked(installSkillCli).mockReset();
    vi.mocked(syncSkillDistribution).mockReset();
  });

  it('点击安装时，地址为空会 toast 提示', async () => {
    const user = userEvent.setup();
    render(<MarketplacePage />);

    await user.click(screen.getByRole('button', { name: '安装' }));

    expect(useToastStore.getState().toasts[0]?.message).toBe('请输入安装地址');
  });

  it('确认安装前会要求输入技能名称，并调用 installSkillCli', async () => {
    const user = userEvent.setup();

    vi.mocked(installSkillCli).mockResolvedValue({
      id: 's1',
      name: 'baoyu-post-to-x',
      enabledAgents: [],
      sourceUrl: 'https://github.com/jimliu/baoyu-skills',
    } satisfies Skill);

    render(<MarketplacePage />);

    await user.type(
      screen.getAllByRole('textbox', { name: '技能仓库地址' })[0],
      'https://github.com/jimliu/baoyu-skills',
    );
    await user.click(screen.getAllByRole('button', { name: '安装' })[0]);

    expect(await screen.findByText('确认技能信息')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('例如: baoyu-post-to-x');
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: '确认安装' }));
    expect(useToastStore.getState().toasts[0]?.message).toBe('请输入技能名称');

    await user.type(nameInput, 'baoyu-post-to-x');
    await user.click(screen.getByRole('button', { name: '确认安装' }));

    expect(vi.mocked(installSkillCli)).toHaveBeenCalledWith(
      'https://github.com/jimliu/baoyu-skills',
      'baoyu-post-to-x',
    );
    expect(vi.mocked(syncSkillDistribution)).toHaveBeenCalledTimes(1);
    const [syncedSkill, syncedAgents] = vi.mocked(syncSkillDistribution).mock.calls[0];
    expect(syncedAgents).toEqual(TEST_AGENTS);
    expect(syncedSkill).toMatchObject({
      name: 'baoyu-post-to-x',
      enabledAgents: [AgentId.CODEX, AgentId.CLAUDE_CODE],
    });
    await waitFor(() => {
      expect(useSkillStore.getState().skills.some((s) => s.name === 'baoyu-post-to-x')).toBe(true);
    });
  });
});
