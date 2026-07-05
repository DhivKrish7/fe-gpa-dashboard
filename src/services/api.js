import { API_BASE_URL } from '../config/api';
import { GRADE_SCALE } from '../constants/grades';
import { COURSES } from '../constants/courses';

const DEFAULT_RETRIES = 1;
const RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getJson = async ({ retries = DEFAULT_RETRIES } = {}) => {
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      const response = await fetch(API_BASE_URL, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      attempt += 1;
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError || new Error('Unable to complete request.');
};

const normalizeString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const normalizeGrade = (grade) => {
  const normalized = normalizeString(grade).toUpperCase();
  if (normalized === 'ABS') return '-';
  return normalized;
};

const parseNumeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const gradeToPoints = (grade) => {
  const normalized = normalizeGrade(grade);
  if (!normalized || normalized === '-') return null;
  return GRADE_SCALE.find((entry) => entry.label === normalized)?.points ?? null;
};

const getClassification = (gpa) => {
  if (gpa === null || Number.isNaN(gpa)) return { label: 'N/A', color: '#475569', bg: '#1e2236' };
  if (gpa >= 3.7) return { label: 'First Class',          color: '#10b981', bg: '#064e3b22' };
  if (gpa >= 3.3) return { label: 'Second Upper',         color: '#6366f1', bg: '#312e8122' };
  if (gpa >= 3.0) return { label: 'Second Lower',         color: '#f59e0b', bg: '#78350f22' };
  if (gpa >= 2.0) return { label: 'Pass',                 color: '#94a3b8', bg: '#1e2940'   };
  return               { label: 'Below Pass',             color: '#f87171', bg: '#450a0a22' };
};

const GRADE_SCALE_LABELS = new Set(GRADE_SCALE.map((g) => g.label));

const round = (value, digits = 3) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(Number(value).toFixed(digits));
};

// ── Course catalogue helpers ──────────────────────────────────────────────────

const getCourseCatalog = () =>
  Object.values(COURSES).flatMap((level) => Object.values(level).flat());

// Semester I = FE 102x, Semester II = FE 103x (first two sems of Level I only)
const SEM1_CODES = new Set(['FE 1021','FE 1022','FE 1023','FE 1024','FE 1025']);
const SEM2_CODES = new Set(['FE 1026','FE 1027','FE 1028','FE 1029','FE 1030']);

// ── Build one student's course rows from raw GAS row ─────────────────────────

const buildCourseRows = (row) => {
  return getCourseCatalog().map((course) => {
    // GAS row keys might be "FE1021" or "FE 1021" — normalise
    const rawGrade =
      row?.[course.code] ??
      row?.[course.code.replace(' ', '')] ??
      row?.grades?.[course.code] ??
      '';
    const grade = normalizeGrade(rawGrade);
    const points = course.nonGPA ? null : gradeToPoints(grade);
    return {
      code:        course.code,
      name:        course.name,
      credits:     course.credits,
      grade,
      points,
      totalPoints: points !== null ? round(points * course.credits, 2) : null,
      graded:      points !== null,
      nonGPA:      Boolean(course.nonGPA),
      editable:    false,
    };
  });
};

// ── Compute semester GPA correctly (weighted, handles absents) ────────────────

const computeGPAFromRows = (courseRows) => {
  let pts = 0, cr = 0;
  for (const c of courseRows) {
    if (c.nonGPA || c.points === null) continue;
    pts += c.points * c.credits;
    cr  += c.credits;
  }
  return cr > 0 ? round(pts / cr) : null;
};

// ── Build forecast scenarios ──────────────────────────────────────────────────

const buildForecast = (overallGpa, earnedCredits, targetGpa) => {
  const GPA_CREDIT_TOTAL = 88;
  const remaining = Math.max(0, GPA_CREDIT_TOTAL - earnedCredits);
  const currentQP = (overallGpa ?? 0) * earnedCredits;

  const neededPerCredit = overallGpa !== null && remaining > 0
    ? round((targetGpa * GPA_CREDIT_TOTAL - currentQP) / remaining, 2)
    : null;

  const scenarios = GRADE_SCALE.map((gs) => {
    const proj = remaining > 0 && overallGpa !== null
      ? (currentQP + gs.points * remaining) / GPA_CREDIT_TOTAL
      : overallGpa;
    return {
      grade:          gs.label,
      points:         gs.points,
      finalGPA:       round(proj),
      classification: getClassification(proj),
      hitsTarget:     proj !== null ? proj >= targetGpa : false,
    };
  });

  return { targetGPA: targetGpa, remainingCredits: remaining, neededPerCredit, scenarios };
};

// ── Build one student payload ─────────────────────────────────────────────────

const buildStudentPayload = (row, targetGpa = 3.7) => {
  // FIX 1: Accept row with just an ID — name and pre-computed GPA are optional
  const id = normalizeString(
    row?.['Reg ID'] ?? row?.['Reg. No'] ?? row?.['reg_id'] ?? row?.id ?? ''
  );
  if (!id) return null; // Only skip if truly no ID

  const name = normalizeString(
    row?.Name ?? row?.['Student Name'] ?? row?.Student ?? id
  );

  const allCourseRows = buildCourseRows(row);

  // Semester GPA — computed properly from weighted grades
  const sem1Rows = allCourseRows.filter((c) => SEM1_CODES.has(c.code));
  const sem2Rows = allCourseRows.filter((c) => SEM2_CODES.has(c.code));
  const sem1GPA  = computeGPAFromRows(sem1Rows);
  const sem2GPA  = computeGPAFromRows(sem2Rows);

  const semesterGroups = [
    {
      key: 'level1Semester1', label: 'Semester I', shortLabel: 'Sem I', level: 'Level I',
      gpa: sem1GPA, credits: sem1Rows.filter((c) => c.points !== null).reduce((s, c) => s + c.credits, 0),
      totalCredits: 10, courses: sem1Rows, classification: getClassification(sem1GPA),
    },
    {
      key: 'level1Semester2', label: 'Semester II', shortLabel: 'Sem II', level: 'Level I',
      gpa: sem2GPA, credits: sem2Rows.filter((c) => c.points !== null).reduce((s, c) => s + c.credits, 0),
      totalCredits: 10, courses: sem2Rows, classification: getClassification(sem2GPA),
    },
  ];

  // FIX 2: Overall GPA — prefer pre-computed from sheet, else compute from grades
  const sheetGpa  = parseNumeric(row?.GPA ?? row?.gpa ?? row?.['GPA Score']);
  const gradedRows = allCourseRows.filter((c) => !c.nonGPA && c.points !== null);
  const earnedCredits = gradedRows.reduce((s, c) => s + c.credits, 0);
  const computedGpa = earnedCredits > 0
    ? round(gradedRows.reduce((s, c) => s + c.points * c.credits, 0) / earnedCredits)
    : null;
  const overallGpa = sheetGpa !== null ? round(sheetGpa, 3) : computedGpa;
  const overallClassification = getClassification(overallGpa);

  // Analytics
  const sorted = [...gradedRows].sort((a, b) => b.points - a.points);
  const strongestSubject = sorted[0]   ? { code: sorted[0].code,   name: sorted[0].name,   grade: sorted[0].grade   } : null;
  const weakestSubject   = sorted.at(-1) ? { code: sorted.at(-1).code, name: sorted.at(-1).name, grade: sorted.at(-1).grade } : null;
  const consistencyScore = gradedRows.length
    ? round((gradedRows.filter((c) => c.points >= 3.0).length / gradedRows.length) * 100, 0)
    : 0;
  const healthScore = overallGpa !== null ? round((overallGpa / 4) * 100, 0) : 0;
  let healthLabel = 'No GPA yet';
  if (healthScore >= 90) healthLabel = 'Excellent';
  else if (healthScore >= 80) healthLabel = 'Strong';
  else if (healthScore >= 65) healthLabel = 'Stable';
  else if (healthScore > 0)   healthLabel = 'Needs attention';

  const forecast = buildForecast(overallGpa, earnedCredits, targetGpa);

  const degreeCredits = 90;
  const gpaCreditTotal = 88;

  return {
    id,
    name,
    gpa: overallGpa,
    stats: {
      semesters: semesterGroups,
      overall:   { gpa: overallGpa, credits: earnedCredits, classification: overallClassification },
      degreeClassification: overallClassification,
      academicHealth:  { score: healthScore, label: healthLabel },
      consistencyScore,
      degreeCredits,
      gpaCreditTotal,
      rank: null,
      percentile: null,
      rankedStudentCount: 0,
      levelProgress: [
        { label: 'Level I',   credits: 30, earned: earnedCredits, percent: round(Math.min(100,(earnedCredits/30)*100),0) },
        { label: 'Level II',  credits: 30, earned: 0, percent: 0 },
        { label: 'Level III', credits: 30, earned: 0, percent: 0 },
      ],
      forecast,
    },
    analytics: {
      strongestSubject,
      weakestSubject,
      consistencyScore,
      academicHealth: { score: healthScore, label: healthLabel },
      subjectScores: [],
    },
    charts: {
      semesterTrend: semesterGroups
        .filter((s) => s.gpa !== null)
        .map((s) => ({ name: s.shortLabel, GPA: s.gpa })),
      subjectComparison: [],
    },
    grades: Object.fromEntries(
      allCourseRows.map((c) => [c.code, c.grade])
    ),
  };
};

// ── Build batch payload ────────────────────────────────────────────────────────

const buildBatchPayload = (rows, targetGpa = 3.7) => {
  const validStudents = rows.map((row) => buildStudentPayload(row, targetGpa)).filter(Boolean);

  // Apply ranks
  const withGpa = validStudents.filter((s) => s.gpa !== null);
  withGpa.sort((a, b) => b.gpa - a.gpa || a.id.localeCompare(b.id));
  const rankMap = new Map(
    withGpa.map((s, i) => [s.id, { rank: i + 1, percentile: round(((withGpa.length - i - 1) / withGpa.length) * 100, 0) }])
  );

  const rankedStudents = validStudents.map((s) => {
    const r = rankMap.get(s.id) || { rank: null, percentile: null };
    return {
      ...s,
      stats: { ...s.stats, rank: r.rank, percentile: r.percentile, rankedStudentCount: withGpa.length },
      rank: r.rank,
      percentile: r.percentile,
      semesterGpas: {
        level1Semester1: s.stats.semesters[0]?.gpa ?? null,
        level1Semester2: s.stats.semesters[1]?.gpa ?? null,
      },
      classification: s.stats.degreeClassification,
    };
  });

  const gpas = validStudents.map((s) => s.gpa).filter((g) => g !== null).sort((a, b) => b - a);
  const averageGpa = gpas.length ? round(gpas.reduce((s, v) => s + v, 0) / gpas.length) : null;

  const buckets = {};
  for (let v = 0; v <= 4; v += 0.25) buckets[v.toFixed(2)] = 0;
  gpas.forEach((g) => {
    const b = (Math.floor(g / 0.25) * 0.25).toFixed(2);
    if (buckets[b] !== undefined) buckets[b]++;
  });

  return {
    students:   rankedStudents,
    leaderboard: rankedStudents.filter((s) => s.gpa !== null).sort((a, b) => a.rank - b.rank),
    averageGpa,
    medianGpa:  gpas.length ? gpas[Math.floor(gpas.length / 2)] : null,
    passRate:   gpas.length ? round((gpas.filter((g) => g >= 2.0).length / gpas.length) * 100, 1) : 0,
    failRate:   gpas.length ? round((gpas.filter((g) => g <  2.0).length / gpas.length) * 100, 1) : 0,
    distribution: Object.entries(buckets).map(([gpa, count]) => ({ gpa: Number(gpa), count, isMe: false })),
  };
};

// ── Public exports ────────────────────────────────────────────────────────────

export const fetchStudents = async () => {
  const payload = await getJson();
  return Array.isArray(payload) ? payload : [];
};

export const fetchStudent = async (id) => {
  const payload = await getJson();
  const rows = Array.isArray(payload) ? payload : [];
  return rows.find((row) =>
    String(row?.['Reg ID'] ?? row?.['Reg. No'] ?? row?.id ?? '') === String(id)
  ) || null;
};

export const fetchLeaderboard = async () => {
  const payload = await getJson();
  return buildBatchPayload(Array.isArray(payload) ? payload : []).leaderboard;
};

export const fetchBatchStats = async () => {
  const payload = await getJson();
  return buildBatchPayload(Array.isArray(payload) ? payload : []);
};

export const fetchSubjects = async () => {
  const payload = await getJson();
  return buildBatchPayload(Array.isArray(payload) ? payload : []).students;
};
