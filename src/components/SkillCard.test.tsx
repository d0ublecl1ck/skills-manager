import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SkillCard from './SkillCard';
import { AgentId, type AgentInfo, type Skill } from '../types';
import { useAgentStore } from '../stores/useAgentStore';
import { useSkillStore } from '../stores/useSkillStore';

vi.mock('../services/skillMdService', () => ({
  getSkillDescriptionFromMd: vi.fn(async () => null),
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
];

describe('SkillCard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAgentStore.setState({ agents: TEST_AGENTS });
  });

  afterEach(() => {
    cleanup();
  });

  it('平台受控技能点击“覆盖重装”会调用 reInstallSkill', async () => {
    const reInstallSkill = vi.fn(async () => {});
    useSkillStore.setState({ reInstallSkill });

    const skill: Skill = {
      id: 'test-skill',
      name: 'Test Skill',
      enabledAgents: [],
      sourceUrl: 'github.com/foo/bar',
      installSource: 'platform',
      isAdopted: true,
    };

    render(<SkillCard skill={skill} />);
    expect(screen.getByText('来自 GitHub')).toBeTruthy();
    const user = userEvent.setup();

    await user.click(screen.getByTitle('检查并执行更新'));

    expect(reInstallSkill).toHaveBeenCalledTimes(1);
    expect(reInstallSkill).toHaveBeenCalledWith('test-skill');
  });

  it('外部识别技能点击更新会打开收编引导弹窗', async () => {
    const reInstallSkill = vi.fn(async () => {});
    useSkillStore.setState({ reInstallSkill });

    const skill: Skill = {
      id: 'ext-1',
      name: 'External Skill',
      enabledAgents: [],
      installSource: 'external',
      isAdopted: false,
    };

    render(<SkillCard skill={skill} />);
    expect(screen.queryByText(/^来自 /)).toBeNull();
    const user = userEvent.setup();

    await user.click(screen.getByTitle('绑定来源后开启自动更新'));

    expect(screen.getByText('绑定来源引导')).toBeTruthy();
    expect(reInstallSkill).not.toHaveBeenCalled();
  });

  it('根据 sourceUrl 域名显示来源名称', () => {
    useSkillStore.setState({ reInstallSkill: vi.fn(async () => {}) });

    const vercelSkill: Skill = {
      id: 'vercel-1',
      name: 'Vercel Skill',
      enabledAgents: [],
      sourceUrl: 'https://vercel.com/xxskill',
      installSource: 'platform',
      isAdopted: true,
    };

    render(<SkillCard skill={vercelSkill} />);
    expect(screen.getByText('来自 Vercel')).toBeTruthy();
  });
});
