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
        headers: {
          Accept: 'application/json',
        },
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
  if (gpa >= 3.7) return { label: 'First Class', color: '#10b981', bg: '#064e3b22' };
  if (gpa >= 3.3) return { label: 'Second Upper', color: '#6366f1', bg: '#312e8122' };
  if (gpa >= 3.0) return { label: 'Second Lower', color: '#f59e0b', bg: '#78350f22' };
  if (gpa >= 2.0) return { label: 'Pass', color: '#94a3b8', bg: '#1e2940' };
  return { label: 'Below Pass', color: '#f87171', bg: '#450a0a22' };
};

const round = (value, digits = 3) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(Number(value).toFixed(digits));
};

const getCourseCatalog = () => Object.values(COURSES).flatMap((level) => Object.values(level).flat());

const buildCourseRows = (student) => {
  return getCourseCatalog().map((course) => {
    const grade = normalizeGrade(student?.[course.code] ?? student?.grades?.[course.code] ?? '');
    const points = gradeToPoints(grade);
    return {
      code: course.code,
      name: course.name,
      credits: course.credits,
      grade,
      points,
      totalPoints: points !== null && course.credits ? round(points * course.credits, 2) : null,
      graded: points !== null,
      nonGPA: Boolean(course.nonGPA),
      editable: false,
    };
  });
};

const buildStudentPayload = (row) => {
  const id = normalizeString(row?.['Reg ID'] || row?.['Reg. No'] || row?.id);
  const name = normalizeString(row?.Name || row?.['Student Name'] || row?.Student);
  const gpa = parseNumeric(row?.GPA || row?.gpa || row?.['GPA Score']);

  if (!id || !name || gpa === null) {
    return null;
  }

  const grades = Object.entries(row || {}).reduce((accumulator, [key, value]) => {
    if (['Reg ID', 'Reg. No', 'id', 'Name', 'Student Name', 'Student', 'GPA', 'gpa', 'GPA Score'].includes(key)) {
      return accumulator;
    }
    accumulator[key] = normalizeGrade(value);
    return accumulator;
  }, {});

  const allCourseRows = buildCourseRows({ ...row, grades });
  const gradedRows = allCourseRows.filter((course) => !course.nonGPA && course.points !== null);
  const points = gradedRows.reduce((sum, course) => sum + (course.points || 0) * course.credits, 0);
  const credits = gradedRows.reduce((sum, course) => sum + course.credits, 0);
  const overallGpa = gpa !== null ? round(gpa, 3) : (credits > 0 ? round(points / credits, 3) : null);
  const overallClassification = getClassification(overallGpa);
  const semesterGroups = [
    {
      key: 'level1Semester1',
      label: 'Semester I',
      shortLabel: 'Sem I',
      level: 'Level I',
      gpa: round((allCourseRows.slice(0, 5).reduce((sum, course) => sum + (course.points || 0) * course.credits, 0) / 10) || null, 3),
      credits: 10,
      totalCredits: 10,
      courses: allCourseRows.slice(0, 5),
    },
    {
      key: 'level1Semester2',
      label: 'Semester II',
      shortLabel: 'Sem II',
      level: 'Level I',
      gpa: round((allCourseRows.slice(5, 10).reduce((sum, course) => sum + (course.points || 0) * course.credits, 0) / 10) || null, 3),
      credits: 10,
      totalCredits: 10,
      courses: allCourseRows.slice(5, 10),
    },
  ];

  const stats = {
    semesters: semesterGroups,
    overall: {
      gpa: overallGpa,
      credits,
      classification: overallClassification,
    },
    degreeClassification: overallClassification,
    academicHealth: { score: overallGpa !== null ? round((overallGpa / 4) * 100, 0) : 0, label: 'No GPA yet' },
    consistencyScore: gradedRows.length ? round((gradedRows.filter((course) => course.points >= 3.0).length / gradedRows.length) * 100, 0) : 0,
    forecast: {
      targetGPA: 3.75,
      remainingCredits: Math.max(0, 88 - credits),
      neededPerCredit: null,
      scenarios: [],
    },
  };

  return {
    id,
    name,
    gpa: overallGpa,
    stats,
    analytics: {
      strongestSubject: null,
      weakestSubject: null,
      consistencyScore: stats.consistencyScore,
      academicHealth: stats.academicHealth,
      subjectScores: [],
    },
    charts: {
      semesterTrend: semesterGroups.filter((semester) => semester.gpa !== null).map((semester) => ({ name: semester.shortLabel, GPA: semester.gpa })),
      subjectComparison: [],
    },
    grades,
  };
};

const buildBatchPayload = (rows) => {
  const validStudents = rows.map((row) => buildStudentPayload(row)).filter(Boolean);
  const rankedStudents = [...validStudents]
    .filter((student) => student.gpa !== null)
    .sort((left, right) => right.gpa - left.gpa || left.id.localeCompare(right.id))
    .map((student, index) => ({
      ...student,
      rank: index + 1,
      semesterGpas: {
        level1Semester1: student.stats.semesters[0]?.gpa ?? null,
        level1Semester2: student.stats.semesters[1]?.gpa ?? null,
      },
      classification: student.stats.degreeClassification,
    }));

  const gpas = validStudents.map((student) => student.gpa).filter((gpa) => gpa !== null);
  const averageGpa = gpas.length ? round(gpas.reduce((sum, value) => sum + value, 0) / gpas.length) : null;
  const buckets = {};
  for (let value = 0; value <= 4; value += 0.25) {
    buckets[value.toFixed(2)] = 0;
  }
  gpas.forEach((gpa) => {
    const bucket = (Math.floor(gpa / 0.25) * 0.25).toFixed(2);
    if (buckets[bucket] !== undefined) buckets[bucket] += 1;
  });

  return {
    students: validStudents,
    leaderboard: rankedStudents,
    averageGpa,
    medianGpa: gpas.length ? gpas[Math.floor(gpas.length / 2)] : null,
    passRate: gpas.length ? round((gpas.filter((gpa) => gpa >= 2.0).length / gpas.length) * 100, 1) : 0,
    failRate: gpas.length ? round((gpas.filter((gpa) => gpa < 2.0).length / gpas.length) * 100, 1) : 0,
    distribution: Object.entries(buckets).map(([gpa, count]) => ({ gpa: Number(gpa), count, isMe: false })),
  };
};

export const fetchStudents = async () => {
  const payload = await getJson();
  return Array.isArray(payload) ? payload : [];
};

export const fetchStudent = async (id) => {
  const payload = await getJson();
  const rows = Array.isArray(payload) ? payload : [];
  return rows.find((row) => String(row?.['Reg ID'] || row?.['Reg. No'] || row?.id) === String(id)) || null;
};

export const fetchLeaderboard = async () => {
  const payload = await getJson();
  const rows = Array.isArray(payload) ? payload : [];
  return buildBatchPayload(rows).leaderboard;
};

export const fetchBatchStats = async () => {
  const payload = await getJson();
  const rows = Array.isArray(payload) ? payload : [];
  return buildBatchPayload(rows);
};

export const fetchSubjects = async () => {
  const payload = await getJson();
  const rows = Array.isArray(payload) ? payload : [];
  return buildBatchPayload(rows).students;
};
