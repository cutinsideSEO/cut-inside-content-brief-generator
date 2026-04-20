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
        archived: 0,
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
        archived: 0,
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
        archived: 0,
      },
      activeFilter: 'all',
    });

    expect(visibleRows.statusRows.some((row) => row.id === 'workflow')).toBe(true);
    expect(visibleRows.statusRows.some((row) => row.id === 'published')).toBe(true);
  });

  it('exposes an archived row only when archived briefs exist or archived filter is active', () => {
    const noArchived = buildSidebarBriefListModel({
      counts: { all: 3, draft: 1, in_progress: 1, complete: 1, workflow: 0, published: 0, archived: 0 },
      activeFilter: 'all',
    });
    expect(noArchived.archivedRow).toBeNull();

    const withArchived = buildSidebarBriefListModel({
      counts: { all: 3, draft: 1, in_progress: 1, complete: 1, workflow: 0, published: 0, archived: 4 },
      activeFilter: 'all',
    });
    expect(withArchived.archivedRow?.count).toBe(4);
    expect(withArchived.archivedRow?.isActive).toBe(false);

    const filteringArchived = buildSidebarBriefListModel({
      counts: { all: 0, draft: 0, in_progress: 0, complete: 0, workflow: 0, published: 0, archived: 0 },
      activeFilter: 'archived',
    });
    expect(filteringArchived.archivedRow?.isActive).toBe(true);
  });
});
