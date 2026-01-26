import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SkillCard from './SkillCard';
import { useAgentStore } from '../stores/useAgentStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useToastStore } from '../stores/useToastStore';
import type { Skill } from '../types';

vi.mock('../services/syncService', () => ({
  syncAllSkillsDistribution: vi.fn(() => Promise.resolve()),
  syncAllSkillsDistributionWithProgress: vi.fn(() => Promise.resolve()),
  syncSkillDistribution: vi.fn(() => Promise.resolve()),
}));

describe('SkillCard', () => {
  beforeEach(() => {
    localStorage.clear();
    useAgentStore.setState({ agents: [] });
    useSkillStore.setState({ skills: [], recycleBin: [], logs: [] });
    useToastStore.getState().clearToasts();
  });

  it('移入垃圾箱后会 toast 提示', async () => {
    const user = userEvent.setup();

    const skill: Skill = {
      id: 's1',
      name: 'demo-skill',
      description: 'demo',
      enabledAgents: [],
    };
    useSkillStore.setState({ skills: [skill], recycleBin: [], logs: [] });

    render(<SkillCard skill={skill} />);

    await user.click(screen.getByRole('button', { name: '移动到垃圾箱' }));
    await user.click(await screen.findByRole('button', { name: '移入垃圾箱' }));

    expect(useToastStore.getState().toasts[0]?.message).toBe('"demo-skill" 已移入垃圾箱');
    expect(useSkillStore.getState().recycleBin.some((s) => s.id === 's1')).toBe(true);
  });
});
