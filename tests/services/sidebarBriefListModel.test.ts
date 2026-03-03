import { describe, expect, it } from 'vitest';
import { buildSidebarBriefListModel } from '../../utils/sidebarBriefListModel';

describe('sidebarBriefListModel', () => {
  it('marks the active status row', () => {
    const model = buildSidebarBriefListModel({
      counts: {
        all: 7,
        draft: 2,
        in_progress: 1,
        complete: 4,
        workflow: 0,
        published: 0,
      },
      activeFilter: 'in_progress',
    });

    expect(model.statusRows.find((row) => row.id === 'in_progress')?.isActive).toBe(true);
    expect(model.statusRows.find((row) => row.id === 'all')?.isActive).toBe(false);
  });

  it('hides zero-count workflow and published rows', () => {
    const hiddenRows = buildSidebarBriefListModel({
      counts: {
        all: 7,
        draft: 2,
        in_progress: 1,
        complete: 4,
        workflow: 0,
        published: 0,
      },
      activeFilter: 'all',
    });

    expect(hiddenRows.statusRows.some((row) => row.id === 'workflow')).toBe(false);
    expect(hiddenRows.statusRows.some((row) => row.id === 'published')).toBe(false);

    const visibleRows = buildSidebarBriefListModel({
      counts: {
        all: 9,
        draft: 2,
        in_progress: 1,
        complete: 4,
        workflow: 1,
        published: 1,
      },
      activeFilter: 'all',
    });

    expect(visibleRows.statusRows.some((row) => row.id === 'workflow')).toBe(true);
    expect(visibleRows.statusRows.some((row) => row.id === 'published')).toBe(true);
  });
});
