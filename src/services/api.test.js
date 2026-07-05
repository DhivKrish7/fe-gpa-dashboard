import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchBatchStats } from './api';

describe('fetchBatchStats', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('transforms Apps Script rows into dashboard batch data and skips malformed records', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          'Reg ID': '25SFE001',
          Name: 'Ada',
          GPA: '3.9',
          'FE 1021': 'A',
          'FE 1022': 'B+',
          'FE 1023': 'A-',
          'FE 1024': 'B',
          'FE 1025': 'A',
          'FE 1026': 'A',
          'FE 1027': 'B',
          'FE 1028': 'A-',
          'FE 1029': 'B+',
          'FE 1030': 'A',
        },
        {
          'Reg ID': '',
          Name: 'Bad',
          GPA: '2.0',
        },
        {
          'Reg ID': '25SFE002',
          Name: 'Ben',
          GPA: null,
          'FE 1021': 'C',
        },
      ],
    });

    const batch = await fetchBatchStats();

    expect(batch.students).toHaveLength(1);
    expect(batch.students[0].id).toBe('25SFE001');
    expect(batch.averageGpa).toBe(3.9);
    expect(batch.leaderboard[0].id).toBe('25SFE001');
    expect(batch.distribution.length).toBeGreaterThan(0);
  });
});
