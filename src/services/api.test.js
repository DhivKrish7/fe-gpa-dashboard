import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchBatchStats, buildForecast } from './api';

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

  it('supports Level II as three semester groups and computes progress from the catalog', async () => {
    fetch.mockResolvedValueOnce(makeFetchResponse([
      {
        'Reg ID': '25SFE010',
        Name: 'Dana',
        'FE 2021': 'A',
        'FE 2026': 'B+',
        'FE 2031': 'A-',
      },
    ]));

    const batch = await fetchBatchStats();
    const student = batch.students[0];
    const levelIISemesters = student.stats.semesters.filter((s) => s.level === 'Level II');
    const levelIIProgress = student.stats.levelProgress.find((item) => item.label === 'Level II');

    expect(levelIISemesters).toHaveLength(3);
    expect(levelIISemesters.map((sem) => sem.totalCredits)).toEqual([10, 10, 12]);
    expect(levelIIProgress).toEqual(expect.objectContaining({ label: 'Level II', credits: 32, earned: 6, percent: 19 }));
  });

  it('generates subject comparison rows with batch averages', async () => {
    fetch.mockResolvedValueOnce(makeFetchResponse([
      {
        'Reg ID': '25SFE011',
        Name: 'Eli',
        'FE 1021': 'A',
        'FE 1022': 'B+',
      },
      {
        'Reg ID': '25SFE012',
        Name: 'Fay',
        'FE 1021': 'B',
        'FE 1022': 'A-',
      },
    ]));

    const batch = await fetchBatchStats();
    const student = batch.students.find((s) => s.id === '25SFE011');
    const subjectRow = student.charts.subjectComparison.find((item) => item.name === 'FE 1021');
    const subjectRow2 = student.charts.subjectComparison.find((item) => item.name === 'FE 1022');

    expect(subjectRow).toEqual({ name: 'FE 1021', label: 'Python Programming', me: 4.0, batch: 3.5 });
    expect(subjectRow2).toEqual({ name: 'FE 1022', label: 'Economics I for Finance', me: 3.3, batch: 3.5 });
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

  it('computes the minimum A/A+ forecast for remaining credits', () => {
    const courseRows = [
      { code: 'C1', nonGPA: false, points: 4.0, credits: 3 },
      { code: 'C2', nonGPA: false, points: null, credits: 2 },
      { code: 'C3', nonGPA: false, points: null, credits: 2 },
    ];

    const forecast = buildForecast(courseRows, 3.7);

    expect(forecast.status).toBe('possible');
    expect(forecast.minimumHighGrades).toBe(0);
    expect(forecast.projectedGPA).toBeCloseTo(3.714, 3);
    expect(forecast.examplePath).toEqual(expect.objectContaining({ 'A-': 1, 'B+': 1 }));
    expect(Object.values(forecast.examplePath).reduce((sum, count) => sum + count, 0)).toBe(2);
    expect(forecast.alternativeScenarios.length).toBeGreaterThanOrEqual(1);
  });

  it('marks forecast impossible when remaining credits cannot meet the target GPA', () => {
    const courseRows = [
      { code: 'C1', nonGPA: false, points: 2.0, credits: 3 },
      { code: 'C2', nonGPA: false, points: null, credits: 2 },
      { code: 'C3', nonGPA: false, points: null, credits: 2 },
    ];

    const forecast = buildForecast(courseRows, 3.7);

    expect(forecast.status).toBe('impossible');
    expect(forecast.minimumHighGrades).toBe(2);
    expect(forecast.projectedGPA).toBeCloseTo(3.143, 3);
    expect(forecast.examplePath['A/A+']).toBe(2);
  });
});
