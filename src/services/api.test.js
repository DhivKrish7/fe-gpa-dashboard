import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchBatchStats } from './api';

const makeFetchResponse = (payload) => ({
  ok: true,
  json: async () => payload,
});

describe('fetchBatchStats', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('calculates GPA from individual course grades and ignores sheet GPA values', async () => {
    fetch.mockResolvedValueOnce(makeFetchResponse([
      {
        'Reg ID': '25SFE001',
        Name: 'Ada',
        GPA: '2.0',
        'FE 1021': 'A',
        'FE 1022': 'A',
        'FE 1023': 'A',
        'FE 1024': 'A',
        'FE 1025': 'A',
      },
    ]));

    const batch = await fetchBatchStats();

    expect(batch.students).toHaveLength(1);
    expect(batch.students[0].id).toBe('25SFE001');
    expect(batch.students[0].gpa).toBe(4.0);
    expect(batch.averageGpa).toBe(4.0);
  });

  it('supports Semester III grades and recalculates overall GPA', async () => {
    fetch.mockResolvedValueOnce(makeFetchResponse([
      {
        'Reg ID': '25SFE002',
        Name: 'Ben',
        'FE 1031': 'A',
        'FE 1032': 'A-',
        'FE 1033': 'B+',
        'FE 1034': 'A',
        'FE 1035': 'B',
      },
    ]));

    const batch = await fetchBatchStats();
    const student = batch.students[0];
    const sem3 = student.stats.semesters.find((s) => s.shortLabel === 'Sem III');

    expect(sem3).toBeDefined();
    expect(sem3.gpa).toBeCloseTo((4.0 + 3.7 + 3.3 + 4.0 + 3.0) / 5, 3);
    expect(student.gpa).toBeCloseTo((4.0 + 3.7 + 3.3 + 4.0 + 3.0) / 5, 3);
  });

  it('excludes non-GPA subjects from GPA calculation', async () => {
    fetch.mockResolvedValueOnce(makeFetchResponse([
      {
        'Reg ID': '25SFE003',
        Name: 'Carol',
        'FE 1021': 'A',
        'FE 1022': 'A',
        'FE 1023': 'A',
        'FE 1024': 'A',
        'FE 1025': 'A',

        'Reg ID': '25SFE004',
        Name: 'Dan',
        'FE 1021': '',
        'FE 1022': 'B',
        'FE 1023': null,
        'FE 1024': 'C',
        'FE 1025': '-',
      },
      {
        'Reg ID': '',
        Name: 'Broken',
        'FE 1021': 'A',
      },
    ]));

    const batch = await fetchBatchStats();
    expect(batch.students).toHaveLength(1);
    expect(batch.students[0].id).toBe('25SFE004');
    expect(batch.students[0].gpa).toBeCloseTo((3.0 * 2 + 2.0 * 2) / 4, 3);
  });

  it('returns updatedAt from Apps Script responses when available', async () => {
    fetch.mockResolvedValueOnce(makeFetchResponse({
      updatedAt: '2026-08-09T12:34:56Z',
      students: [
        {
          'Reg ID': '25SFE005',
          Name: 'Eve',
          'FE 1021': 'B',
          'FE 1022': 'B',
          'FE 1023': 'B',
          'FE 1024': 'B',
          'FE 1025': 'B',
        },
      ],
    }));

    const batch = await fetchBatchStats();
    expect(batch.updatedAt).toBe('2026-08-09T12:34:56Z');
    expect(batch.students[0].gpa).toBe(3.0);
  });

  it('preserves unknown course columns without breaking calculations', async () => {
    fetch.mockResolvedValueOnce(makeFetchResponse([
      {
        'Reg ID': '25SFE006',
        Name: 'Fay',
        'FE 1021': 'A',
        'FE 9999': 'A',
      },
    ]));

    const batch = await fetchBatchStats();
    expect(batch.students[0].grades['FE 9999']).toBe('A');
    expect(batch.students[0].gpa).toBe(4.0);
  });
});
