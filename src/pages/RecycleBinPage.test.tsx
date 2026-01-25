import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import RecycleBinPage from './RecycleBinPage';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useSkillStore } from '../stores/useSkillStore';
import type { Skill } from '../types';
import { addDaysByRetentionPolicy, formatLocalDateTimeToMinute } from '../lib/datetime';

describe('RecycleBinPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSettingsStore.setState({ recycleBinRetentionDays: 2 });
    useSkillStore.setState({ skills: [], recycleBin: [], logs: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('垃圾箱卡片显示将彻底删除的时间（精确到分钟）', () => {
    const deletedAt = '2026-01-10T12:34:56Z';
    const skill: Skill = {
      id: 's1',
      name: 'Skill One',
      enabledAgents: [],
      deletedAt,
    };
    useSkillStore.setState({ recycleBin: [skill] });

    const expected = formatLocalDateTimeToMinute(
      addDaysByRetentionPolicy(new Date(deletedAt), 2),
    );

    render(<RecycleBinPage />);

    const purgeLines = screen.getAllByText((_, element) => {
      if (!element || element.tagName !== 'SPAN') return false;
      const text = element?.textContent ?? '';
      return text.includes('将于:') && text.includes('彻底删除');
    });

    expect(purgeLines).toHaveLength(1);
    const purgeLine = purgeLines[0];

    expect(purgeLine).toHaveTextContent(expected);
    expect(purgeLine.textContent).toMatch(/\d{2}:\d{2}(?!:\d{2})/);
  });
});
