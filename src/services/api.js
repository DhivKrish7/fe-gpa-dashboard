import { API_BASE_URL } from '../config/api';
import { GRADE_SCALE } from '../constants/grades';
import { COURSES } from '../constants/courses';

const DEFAULT_RETRIES = 1;
const RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildApiUrl = () => {
  try {
    const base = API_BASE_URL;
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost';
    const url = new URL(base, origin);
    url.searchParams.set('t', `${Date.now()}`);
    return url.toString();
  } catch {
    return `${API_BASE_URL}${API_BASE_URL.includes('?') ? '&' : '?'}t=${Date.now()}`;
  }
};

const normalizePayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.students)) return payload.students;
  return null;
};

const getUpdatedAt = (payload) => {
  if (!payload || typeof payload.updatedAt !== 'string') return null;
  return payload.updatedAt;
};

const getJson = async ({ retries = DEFAULT_RETRIES } = {}) => {
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      const response = await fetch(buildApiUrl(), {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data === null || data === undefined) {
        throw new Error('Empty API response');
      }
      return data;
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

const normalizeCourseCode = (code) => {
  const raw = String(code ?? '').trim().toUpperCase();
  if (!raw) return '';
  const spaced = raw.replace(/^([A-Z]{2})(\d{4})$/, '$1 $2');
  return spaced.replace(/\s+/g, ' ');
};

const formatShortLabel = (label) => {
  if (!label) return '';
  return label
    .replace(/^Semester\s+/i, 'Sem ')
    .replace(/^Level\s+/i, 'L ')
    .replace(/Core Courses/i, 'Core')
    .replace(/Financial Analytics Stream/i, 'FA Stream')
    .replace(/Business Analysis Stream/i, 'BA Stream')
    .replace(/BI Systems Stream/i, 'BI Stream');
};

const getCourseCatalog = () =>
  Object.values(COURSES).flatMap((levelCourses) =>
    Object.values(levelCourses).flat()
  );

const getCourseGroups = () =>
  Object.entries(COURSES).flatMap(([level, semesters]) =>
    Object.entries(semesters).map(([semesterLabel, courses]) => ({
      level,
      label: semesterLabel,
      shortLabel: formatShortLabel(semesterLabel),
      key: `${level}-${semesterLabel}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase(),
      courses,
    }))
  );

const getCanonicalSemesterKey = (level, label) => {
  const levelKey = String(level).replace(/\s+/g, '').toLowerCase();
  const semMatch = String(label).match(/Semester\s*(\d+)/i);
  if (levelKey === 'leveli' && semMatch) {
    return `level1Semester${semMatch[1]}`;
  }
  if (levelKey === 'levelii' && semMatch) {
    return `level2Semester${semMatch[1]}`;
  }
  if (levelKey === 'leveliii' && /Core/i.test(label)) {
    return 'level3Core';
  }
  return `${levelKey}${String(label).replace(/\s+/g, '')}`;
};

// ── Build one student's course rows from raw GAS row ─────────────────────────

const buildCourseRows = (row) => {
  const catalog = getCourseCatalog();
  const catalogCodes = new Set(catalog.map((course) => normalizeCourseCode(course.code)));

  const getNormalizedGrade = (courseCode) => {
    const normalized = normalizeCourseCode(courseCode);
    return (
      row?.[courseCode] ??
      row?.[courseCode.replace(' ', '')] ??
      row?.[normalized] ??
      row?.[normalized.replace(' ', '')] ??
      row?.grades?.[courseCode] ??
      row?.grades?.[normalized] ??
      ''
    );
  };

  const knownCourseRows = catalog.map((course) => {
    const rawGrade = getNormalizedGrade(course.code);
    const grade = normalizeGrade(rawGrade);
    const points = course.nonGPA ? null : gradeToPoints(grade);
    return {
      code: course.code,
      name: course.name,
      credits: course.credits,
      grade,
      points,
      totalPoints: points !== null ? round(points * course.credits, 2) : null,
      graded: points !== null,
      nonGPA: Boolean(course.nonGPA),
      editable: false,
    };
  });

  const extraCourseRows = Object.keys(row || {}).reduce((extra, key) => {
    const code = normalizeCourseCode(key);
    if (!code || !/^[A-Z]{2}\s\d{4}$/.test(code) || catalogCodes.has(code)) return extra;
    const rawGrade = normalizeGrade(row[key]);
    return extra.concat({
      code,
      name: code,
      credits: null,
      grade: rawGrade,
      points: null,
      totalPoints: null,
      graded: false,
      nonGPA: true,
      editable: false,
      unknown: true,
    });
  }, []);

  return [...knownCourseRows, ...extraCourseRows];
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

const HIGH_GRADE_POINTS = 4.0;
const HIGH_GRADE_LABEL = 'A/A+';

const getGradeEntry = (label) => GRADE_SCALE.find((entry) => entry.label === label) || null;
const getGradesBelow = (points) => GRADE_SCALE.filter((entry) => entry.points < points).sort((a, b) => b.points - a.points || a.label.localeCompare(b.label));
const getGradesDesc = () => [...GRADE_SCALE].sort((a, b) => b.points - a.points || a.label.localeCompare(b.label));

const buildExamplePath = (remaining, highCount, completedQualityPoints, totalCredits, targetQualityPoints) => {
  const sortedRemaining = [...remaining].sort((a, b) => b.credits - a.credits);
  const bestNonHighEntry = getGradesBelow(HIGH_GRADE_POINTS)[0] || { label: 'E', points: 0 };

  const assignments = sortedRemaining.map((course, index) => ({
    course,
    gradeLabel: index < highCount ? HIGH_GRADE_LABEL : bestNonHighEntry.label,
    points: index < highCount ? HIGH_GRADE_POINTS : bestNonHighEntry.points,
    credits: course.credits,
  }));

  let currentQualityPoints = completedQualityPoints + assignments.reduce((sum, assignment) => sum + assignment.points * assignment.credits, 0);

  const nonHighAssignments = assignments
    .filter((assignment) => assignment.gradeLabel !== HIGH_GRADE_LABEL)
    .sort((a, b) => a.credits - b.credits);

  const nonHighGradeEntries = getGradesDesc().filter((entry) => entry.points < HIGH_GRADE_POINTS);

  for (const assignment of nonHighAssignments) {
    let currentIndex = nonHighGradeEntries.findIndex((entry) => entry.points === assignment.points);
    while (currentIndex < nonHighGradeEntries.length - 1) {
      const nextEntry = nonHighGradeEntries[currentIndex + 1];
      const delta = (assignment.points - nextEntry.points) * assignment.credits;
      if (currentQualityPoints - delta >= targetQualityPoints) {
        currentQualityPoints -= delta;
        assignment.points = nextEntry.points;
        assignment.gradeLabel = nextEntry.label;
        currentIndex += 1;
        continue;
      }
      break;
    }
  }

  return assignments.reduce((path, assignment) => {
    const label = assignment.gradeLabel === HIGH_GRADE_LABEL ? HIGH_GRADE_LABEL : assignment.gradeLabel;
    path[label] = (path[label] || 0) + 1;
    return path;
  }, {});
};

const buildForecast = (courseRows, targetGpa = 3.7) => {
  const completed = courseRows.filter((course) => !course.nonGPA && course.points !== null);
  const remaining = courseRows.filter((course) => !course.nonGPA && course.points === null);

  const completedCredits = completed.reduce((sum, course) => sum + course.credits, 0);
  const completedQualityPoints = completed.reduce((sum, course) => sum + course.points * course.credits, 0);
  const remainingCredits = remaining.reduce((sum, course) => sum + course.credits, 0);
  const totalCredits = completedCredits + remainingCredits;

  const currentGPA = completedCredits > 0 ? round(completedQualityPoints / completedCredits) : null;
  const targetQualityPoints = targetGpa * totalCredits;
  const maxPossibleQualityPoints = completedQualityPoints + remainingCredits * HIGH_GRADE_POINTS;
  const minPossibleQualityPoints = completedQualityPoints + remainingCredits * Math.min(...GRADE_SCALE.map((entry) => entry.points));

  const maxAchievableGPA = totalCredits > 0 ? round(maxPossibleQualityPoints / totalCredits) : null;
  const minAchievableGPA = totalCredits > 0 ? round(minPossibleQualityPoints / totalCredits) : null;

  const status = (() => {
    if (totalCredits === 0) return 'possible';
    if (maxPossibleQualityPoints < targetQualityPoints) return 'impossible';
    if (minPossibleQualityPoints >= targetQualityPoints) return 'guaranteed';
    return 'possible';
  })();

  let minimumHighGrades = null;
  let projectedGPA = null;
  let examplePath = {};
  let alternativeScenarios = [];

  if (status === 'possible') {
    const sortedRemaining = [...remaining].sort((a, b) => b.credits - a.credits);
    const bestNonHighEntry = getGradesBelow(HIGH_GRADE_POINTS)[0] || { points: 0 };
    const bestNonHighPoint = bestNonHighEntry.points;

    for (let highCount = 0; highCount <= remaining.length; highCount += 1) {
      const highCourses = sortedRemaining.slice(0, highCount);
      const highQualityPoints = highCourses.reduce((sum, course) => sum + course.credits * HIGH_GRADE_POINTS, 0);
      const otherCredits = remainingCredits - highCourses.reduce((sum, course) => sum + course.credits, 0);
      const candidateQualityPoints = completedQualityPoints + highQualityPoints + otherCredits * bestNonHighPoint;
      const candidateGPA = totalCredits > 0 ? candidateQualityPoints / totalCredits : null;

      if (candidateGPA !== null && candidateGPA >= targetGpa) {
        minimumHighGrades = highCount;
        projectedGPA = round(candidateGPA);
        break;
      }
    }

    if (minimumHighGrades === null) {
      minimumHighGrades = remaining.length;
      projectedGPA = maxAchievableGPA;
    }

    examplePath = buildExamplePath(remaining, minimumHighGrades, completedQualityPoints, totalCredits, targetQualityPoints);
    const comparisonCount = Math.min(3, remaining.length - minimumHighGrades + 1);
    for (let extra = 0; extra < comparisonCount; extra += 1) {
      const highCount = Math.min(minimumHighGrades + extra, remaining.length);
      const highCourses = sortedRemaining.slice(0, highCount);
      const highQualityPoints = highCourses.reduce((sum, course) => sum + course.credits * HIGH_GRADE_POINTS, 0);
      const otherCredits = remainingCredits - highCourses.reduce((sum, course) => sum + course.credits, 0);
      const candidateQualityPoints = completedQualityPoints + highQualityPoints + otherCredits * bestNonHighPoint;
      alternativeScenarios.push({ highGrades: highCount, projectedGPA: round(totalCredits > 0 ? candidateQualityPoints / totalCredits : null) });
    }
  }

  if (status === 'guaranteed') {
    projectedGPA = minAchievableGPA;
    examplePath = remaining.length > 0 ? { [HIGH_GRADE_LABEL]: 0, E: remaining.length } : {};
    alternativeScenarios = [{ highGrades: 0, projectedGPA: minAchievableGPA }];
  }

  if (status === 'impossible') {
    minimumHighGrades = remaining.length;
    examplePath = remaining.length > 0 ? { [HIGH_GRADE_LABEL]: remaining.length } : {};
    projectedGPA = maxAchievableGPA;
    alternativeScenarios = [{ highGrades: remaining.length, projectedGPA: maxAchievableGPA }];
  }

  return {
    targetGPA: targetGpa,
    currentGPA,
    completedCredits,
    remainingCredits,
    remainingSubjects: remaining.length,
    totalCredits,
    status,
    minimumHighGrades,
    examplePath,
    projectedGPA,
    maxAchievableGPA,
    alternativeScenarios,
  };
};

const getLevelProgress = (semesterGroups) => {
  return ['Level I', 'Level II', 'Level III'].map((level) => {
    const groups = semesterGroups.filter((group) => group.level === level);
    const totalCredits = groups.reduce((sum, group) => sum + (group.totalCredits ?? 0), 0);
    const earnedCredits = groups.reduce((sum, group) => sum + (group.credits ?? 0), 0);
    return {
      label: level,
      credits: totalCredits,
      earned: earnedCredits,
      percent: totalCredits > 0 ? round(Math.min(100, (earnedCredits / totalCredits) * 100), 0) : 0,
    };
  });
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
  const courseRowMap = new Map(allCourseRows.map((course) => [course.code, course]));
  const extraCourseRows = allCourseRows.filter((course) => course.unknown);

  const semesterGroups = getCourseGroups().map((group) => {
    const courses = group.courses.map((course) =>
      courseRowMap.get(course.code) ?? {
        code: course.code,
        name: course.name,
        credits: course.credits,
        grade: '',
        points: null,
        totalPoints: null,
        graded: false,
        nonGPA: Boolean(course.nonGPA),
        editable: false,
      }
    );

    const gpa = computeGPAFromRows(courses);
    const gradedCredits = courses.filter((c) => !c.nonGPA && c.points !== null).reduce((s, c) => s + c.credits, 0);
    const totalCredits = courses.reduce((s, c) => s + (c.credits ?? 0), 0);
    return {
      key: group.key,
      label: group.label,
      shortLabel: group.shortLabel,
      level: group.level,
      gpa,
      credits: gradedCredits,
      totalCredits,
      courses,
      classification: getClassification(gpa),
    };
  });

  if (extraCourseRows.length) {
    semesterGroups.push({
      key: 'additionalCourses',
      label: 'Additional Courses',
      shortLabel: 'Other',
      level: 'Unknown',
      gpa: null,
      credits: 0,
      totalCredits: 0,
      courses: extraCourseRows,
      classification: getClassification(null),
    });
  }

  const gradedRows = allCourseRows.filter((c) => !c.nonGPA && c.points !== null);
  const earnedCredits = gradedRows.reduce((s, c) => s + c.credits, 0);
  const computedGpa = earnedCredits > 0
    ? round(gradedRows.reduce((s, c) => s + c.points * c.credits, 0) / earnedCredits)
    : null;
  const overallGpa = computedGpa;
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

  const forecast = buildForecast(allCourseRows, targetGpa);

  const degreeCredits = 90;
  const gpaCreditTotal = 88;
  const levelProgress = getLevelProgress(semesterGroups);

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
      forecast,
      levelProgress,
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

  const idCounts = new Map();
  const uniqueStudents = validStudents.map((student) => {
    const count = idCounts.get(student.id) ?? 0;
    idCounts.set(student.id, count + 1);
    return {
      ...student,
      originalId: student.id,
      id: count > 0 ? `${student.id} (${count + 1})` : student.id,
      duplicateRegistrationId: count > 0,
    };
  });

  // Apply ranks
  const withGpa = uniqueStudents.filter((s) => s.gpa !== null);
  withGpa.sort((a, b) => b.gpa - a.gpa || a.id.localeCompare(b.id));
  const rankMap = new Map(
    withGpa.map((s, i) => [s.id, { rank: i + 1, percentile: round(((withGpa.length - i - 1) / withGpa.length) * 100, 0) }])
  );

  const rankedStudents = uniqueStudents.map((s) => {
    const r = rankMap.get(s.id) || { rank: null, percentile: null };
    const semesterGpas = s.stats.semesters.reduce((acc, sem) => {
      const canonical = getCanonicalSemesterKey(sem.level, sem.label);
      acc[sem.key] = sem.gpa;
      acc[canonical] = sem.gpa;
      return acc;
    }, {});
    return {
      ...s,
      stats: { ...s.stats, rank: r.rank, percentile: r.percentile, rankedStudentCount: withGpa.length },
      rank: r.rank,
      percentile: r.percentile,
      semesterGpas,
      classification: s.stats.degreeClassification,
    };
  });

  const subjectTotals = {};
  rankedStudents.forEach((student) => {
    const courseRows = student.stats.semesters.flatMap((sem) => sem.courses);
    courseRows.forEach((course) => {
      if (course.nonGPA || course.points === null) return;
      const totals = subjectTotals[course.code] ?? { code: course.code, name: course.name, total: 0, count: 0 };
      totals.total += course.points;
      totals.count += 1;
      subjectTotals[course.code] = totals;
    });
  });

  const subjectAverages = Object.fromEntries(
    Object.entries(subjectTotals).map(([code, totals]) => [code, round(totals.total / totals.count, 3)])
  );

  const studentsWithComparison = rankedStudents.map((student) => {
    const seen = new Set();
    const subjectComparison = student.stats.semesters.flatMap((sem) => sem.courses)
      .filter((course) => !course.nonGPA && course.points !== null && !seen.has(course.code))
      .map((course) => {
        seen.add(course.code);
        return {
          name: course.code,
          label: course.name,
          me: course.points,
          batch: subjectAverages[course.code] ?? null,
        };
      });

    return {
      ...student,
      charts: {
        ...student.charts,
        subjectComparison,
      },
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

  const finalStudents = studentsWithComparison;

  return {
    students:   finalStudents,
    leaderboard: finalStudents.filter((s) => s.gpa !== null).sort((a, b) => a.rank - b.rank),
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
  const rows = normalizePayload(payload);
  return rows ?? [];
};

export const fetchStudent = async (id) => {
  const payload = await getJson();
  const rows = normalizePayload(payload) ?? [];
  return rows.find((row) =>
    String(row?.['Reg ID'] ?? row?.['Reg. No'] ?? row?.id ?? '') === String(id)
  ) || null;
};

export const fetchLeaderboard = async () => {
  const payload = await getJson();
  const rows = normalizePayload(payload) ?? [];
  return buildBatchPayload(rows).leaderboard;
};

export const fetchBatchStats = async () => {
  const payload = await getJson();
  const rows = normalizePayload(payload);
  if (!rows) throw new Error('Invalid API response shape');
  const batch = buildBatchPayload(rows);
  return { ...batch, updatedAt: getUpdatedAt(payload) };
};

export const fetchSubjects = async () => {
  const payload = await getJson();
  const rows = normalizePayload(payload) ?? [];
  return buildBatchPayload(rows).students;
};

export { buildForecast };
