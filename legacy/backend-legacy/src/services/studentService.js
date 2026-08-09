const googleSheetsService = require('./googleSheetsService');
const {
  DEGREE_TOTAL_CREDITS,
  GPA_COURSES,
  GPA_CREDIT_TOTAL,
  GRADE_POINTS,
  GRADE_SCALE,
  LEVEL_ONE_COURSES,
  SEMESTER_GROUPS,
} = require('../constants/academicCatalog');

const DEFAULT_TARGET_GPA = 3.75;

const round = (value, digits = 3) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(Number(value).toFixed(digits));
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeGrade = (grade) => {
  if (grade === null || grade === undefined) return '';
  const trimmed = String(grade).trim().toUpperCase();
  if (trimmed === 'ABS') return '-';
  return trimmed;
};

const gradeToPoints = (grade) => {
  const normalized = normalizeGrade(grade);
  if (!normalized || normalized === '-') return null;
  return GRADE_POINTS[normalized] ?? null;
};

const getClassification = (gpa) => {
  if (gpa === null || Number.isNaN(gpa)) return { label: 'N/A', color: '#475569', bg: '#1e2236' };
  if (gpa >= 3.7) return { label: 'First Class', color: '#10b981', bg: '#064e3b22' };
  if (gpa >= 3.3) return { label: 'Second Upper', color: '#6366f1', bg: '#312e8122' };
  if (gpa >= 3.0) return { label: 'Second Lower', color: '#f59e0b', bg: '#78350f22' };
  if (gpa >= 2.0) return { label: 'Pass', color: '#94a3b8', bg: '#1e2940' };
  return { label: 'Below Pass', color: '#f87171', bg: '#450a0a22' };
};

const toStudentGrades = (student, overrides = {}) => {
  const sourceGrades = student.grades && typeof student.grades === 'object' ? student.grades : student;
  return GPA_COURSES.reduce((accumulator, course) => {
    accumulator[course.code] = normalizeGrade(overrides[course.code] ?? sourceGrades?.[course.code] ?? '');
    return accumulator;
  }, {});
};

const computeCourseRows = (grades, group) => group.courses.map((course) => {
  const grade = normalizeGrade(grades[course.code]);
  const points = course.nonGPA ? null : gradeToPoints(grade);
  const totalPoints = points !== null ? points * course.credits : null;

  return {
    code: course.code,
    name: course.name,
    credits: course.credits,
    grade,
    points,
    totalPoints: round(totalPoints, 2),
    graded: points !== null,
    nonGPA: Boolean(course.nonGPA),
    editable: Boolean(group.editable),
  };
});

const computeGPA = (courseRows) => {
  const totals = courseRows.reduce((accumulator, course) => {
    if (course.nonGPA || course.points === null) return accumulator;
    accumulator.points += course.points * course.credits;
    accumulator.credits += course.credits;
    return accumulator;
  }, { points: 0, credits: 0 });

  const gpa = totals.credits > 0 ? totals.points / totals.credits : null;
  return {
    gpa: round(gpa),
    credits: totals.credits,
    points: round(totals.points, 2),
    classification: getClassification(gpa),
  };
};

const getHealth = (gpa) => {
  const score = gpa !== null ? round(clamp((gpa / 4) * 100, 0, 100), 0) : 0;
  let label = 'No GPA yet';
  if (score >= 90) label = 'Excellent';
  else if (score >= 80) label = 'Strong';
  else if (score >= 65) label = 'Stable';
  else if (score > 0) label = 'Needs attention';

  return { score, label };
};

const getForecast = (overall, targetGPA = DEFAULT_TARGET_GPA) => {
  const remainingCredits = Math.max(0, GPA_CREDIT_TOTAL - overall.credits);
  const target = clamp(Number(targetGPA) || DEFAULT_TARGET_GPA, 0, 4);
  const neededPerCredit = overall.gpa !== null && overall.credits > 0 && remainingCredits > 0
    ? (target * GPA_CREDIT_TOTAL - overall.gpa * overall.credits) / remainingCredits
    : null;

  const scenarios = GRADE_SCALE.map((grade) => {
    const projectedGPA = remainingCredits > 0 && overall.gpa !== null
      ? ((overall.gpa * overall.credits) + (grade.points * remainingCredits)) / GPA_CREDIT_TOTAL
      : overall.gpa;

    return {
      grade: grade.label,
      points: grade.points,
      finalGPA: round(projectedGPA),
      classification: getClassification(projectedGPA),
      hitsTarget: projectedGPA !== null ? projectedGPA >= target : false,
    };
  });

  return {
    targetGPA: target,
    remainingCredits,
    neededPerCredit: round(neededPerCredit, 2),
    scenarios,
  };
};

const getLevelProgress = (semesterGroups) => ['Level I', 'Level II', 'Level III'].map((level) => {
  const groups = semesterGroups.filter((group) => group.level === level);
  const credits = groups.reduce((sum, group) => sum + group.totalCredits, 0);
  const earned = groups.reduce((sum, group) => sum + group.credits, 0);

  return {
    label: level,
    credits,
    earned,
    percent: credits > 0 ? round((earned / credits) * 100, 0) : 0,
  };
});

const buildBasicStudent = (student, options = {}) => {
  const grades = toStudentGrades(student, options.overrides);
  const semesterGroups = SEMESTER_GROUPS.map((group) => {
    const courses = computeCourseRows(grades, group);
    const stats = computeGPA(courses);
    return {
      key: group.key,
      label: group.label,
      shortLabel: group.shortLabel,
      level: group.level,
      editable: Boolean(group.editable),
      totalCredits: group.courses.reduce((sum, course) => sum + course.credits, 0),
      courses,
      ...stats,
    };
  });

  const allCourseRows = semesterGroups.flatMap((group) => group.courses);
  const levelOneRows = allCourseRows.filter((course) => LEVEL_ONE_COURSES.some((item) => item.code === course.code));
  const overall = computeGPA(allCourseRows);
  const levelOne = computeGPA(levelOneRows);
  const gradedRows = allCourseRows.filter((course) => !course.nonGPA && course.points !== null);
  const consistencyScore = gradedRows.length
    ? round((gradedRows.filter((course) => course.points >= 3.0).length / gradedRows.length) * 100, 0)
    : 0;

  return {
    id: student.id,
    name: student.name,
    rawGpa: student.gpa,
    grades,
    stats: {
      semesters: semesterGroups,
      levelOne,
      overall,
      degreeClassification: overall.classification,
      academicHealth: getHealth(overall.gpa),
      consistencyScore,
      degreeCredits: DEGREE_TOTAL_CREDITS,
      gpaCreditTotal: GPA_CREDIT_TOTAL,
      levelProgress: getLevelProgress(semesterGroups),
      forecast: getForecast(overall, options.targetGPA),
    },
  };
};

const calculateSubjectStats = (students) => {
  return GPA_COURSES.reduce((accumulator, course) => {
    const values = students
      .map((student) => student.stats.semesters.flatMap((group) => group.courses).find((row) => row.code === course.code)?.points)
      .filter((value) => value !== null && value !== undefined);

    accumulator[course.code] = {
      code: course.code,
      name: course.name,
      credits: course.credits,
      entries: values.length,
      averagePoints: values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length, 2) : null,
      values,
    };
    return accumulator;
  }, {});
};

const applySubjectAnalytics = (student, subjectStats) => {
  const subjectScores = student.stats.semesters
    .flatMap((group) => group.courses)
    .filter((course) => !course.nonGPA)
    .map((course) => {
      const stats = subjectStats[course.code] || { values: [], averagePoints: null };
      const percentile = course.points !== null && stats.values.length
        ? round((stats.values.filter((value) => value < course.points).length / stats.values.length) * 100, 1)
        : null;

      return {
        code: course.code,
        name: course.name,
        credits: course.credits,
        grade: course.grade,
        points: course.points,
        batchAveragePoints: stats.averagePoints,
        percentile,
        difficulty: course.points !== null && stats.averagePoints !== null ? round(stats.averagePoints - course.points, 2) : null,
      };
    });

  const gradedSubjects = subjectScores.filter((subject) => subject.points !== null);
  const strongestSubject = [...gradedSubjects].sort((left, right) => right.points - left.points || left.code.localeCompare(right.code))[0] || null;
  const weakestSubject = [...gradedSubjects].sort((left, right) => left.points - right.points || left.code.localeCompare(right.code))[0] || null;

  return {
    ...student,
    analytics: {
      strongestSubject,
      weakestSubject,
      consistencyScore: student.stats.consistencyScore,
      academicHealth: student.stats.academicHealth,
      subjectScores,
    },
    charts: {
      semesterTrend: student.stats.semesters
        .filter((semester) => semester.level === 'Level I' && semester.gpa !== null)
        .map((semester) => ({ name: semester.shortLabel, GPA: semester.gpa })),
      subjectComparison: subjectScores
        .filter((subject) => LEVEL_ONE_COURSES.some((course) => course.code === subject.code))
        .map((subject) => ({
          name: subject.code.replace('FE ', ''),
          me: subject.points,
          batch: subject.batchAveragePoints,
        })),
    },
  };
};

const applyRankings = (students) => {
  const ranked = [...students]
    .filter((student) => student.stats.overall.gpa !== null)
    .sort((left, right) => right.stats.overall.gpa - left.stats.overall.gpa || left.id.localeCompare(right.id));

  const rankLookup = new Map(ranked.map((student, index) => {
    const rank = index + 1;
    return [student.id, {
      rank,
      percentile: round(((ranked.length - rank + 1) / ranked.length) * 100, 0),
    }];
  }));

  return students.map((student) => {
    const ranking = rankLookup.get(student.id) || { rank: null, percentile: null };
    return {
      ...student,
      stats: {
        ...student.stats,
        rank: ranking.rank,
        percentile: ranking.percentile,
        rankedStudentCount: ranked.length,
      },
    };
  });
};

const getComputedStudents = async (options = {}) => {
  const rawStudents = await googleSheetsService.getStudents();
  const selectedId = String(options.selectedStudentId || '').trim().toLowerCase();

  const basicStudents = rawStudents.map((student) => {
    const shouldApplyOverrides = selectedId && String(student.id).trim().toLowerCase() === selectedId;
    return buildBasicStudent(student, {
      targetGPA: options.targetGPA,
      overrides: shouldApplyOverrides ? options.overrides : {},
    });
  });

  const subjectStats = calculateSubjectStats(basicStudents);
  return applyRankings(basicStudents.map((student) => applySubjectAnalytics(student, subjectStats)));
};

const getBatchDistribution = (gpas, currentGPA = null) => {
  const buckets = {};
  const step = 0.25;
  for (let value = 0; value <= 4; value += step) {
    buckets[value.toFixed(2)] = 0;
  }

  gpas.forEach((gpa) => {
    const bucket = (Math.floor(gpa / step) * step).toFixed(2);
    if (buckets[bucket] !== undefined) buckets[bucket] += 1;
  });

  const currentBucket = currentGPA !== null ? (Math.floor(currentGPA / step) * step).toFixed(2) : null;
  return Object.entries(buckets).map(([gpa, count]) => ({
    gpa: Number(gpa),
    count,
    isMe: currentBucket !== null && gpa === currentBucket,
  }));
};

const getStudentIds = async () => {
  const students = await googleSheetsService.getStudents();
  return students.map((student) => student.id).filter(Boolean);
};

const getStudentById = async (id, options = {}) => {
  const students = await getComputedStudents({
    ...options,
    selectedStudentId: id,
  });
  const normalizedId = String(id || '').trim().toLowerCase();
  return students.find((student) => String(student.id).trim().toLowerCase() === normalizedId) || null;
};

const getLeaderboard = async (options = {}) => {
  const students = await getComputedStudents(options);
  return students
    .filter((student) => student.stats.overall.gpa !== null)
    .sort((left, right) => left.stats.rank - right.stats.rank)
    .map((student) => ({
      id: student.id,
      name: student.name,
      gpa: student.stats.overall.gpa,
      semesterGpas: student.stats.semesters.reduce((accumulator, semester) => {
        accumulator[semester.key] = semester.gpa;
        return accumulator;
      }, {}),
      rank: student.stats.rank,
      percentile: student.stats.percentile,
      classification: student.stats.degreeClassification,
      credits: student.stats.overall.credits,
    }));
};

const getBatchStatistics = async (options = {}) => {
  const students = await getComputedStudents(options);
  const gpas = students
    .map((student) => student.stats.overall.gpa)
    .filter((gpa) => gpa !== null)
    .sort((left, right) => right - left);
  const selectedStudent = options.selectedStudentId
    ? students.find((student) => String(student.id).trim().toLowerCase() === String(options.selectedStudentId).trim().toLowerCase())
    : null;
  const averageGpa = gpas.length ? round(gpas.reduce((sum, value) => sum + value, 0) / gpas.length) : null;
  const medianGpa = gpas.length ? gpas[Math.floor(gpas.length / 2)] : null;
  const leaderboard = await getLeaderboard(options);

  return {
    totalStudents: students.length,
    totalWithGpa: gpas.length,
    averageGpa,
    medianGpa,
    highestGpa: gpas.length ? Math.max(...gpas) : null,
    lowestGpa: gpas.length ? Math.min(...gpas) : null,
    passRate: gpas.length ? round((gpas.filter((gpa) => gpa >= 2.0).length / gpas.length) * 100, 1) : 0,
    failRate: gpas.length ? round((gpas.filter((gpa) => gpa < 2.0).length / gpas.length) * 100, 1) : 0,
    distribution: getBatchDistribution(gpas, selectedStudent?.stats.overall.gpa ?? null),
    students,
    leaderboard,
  };
};

const getSubjectAnalytics = async (options = {}) => {
  const students = await getComputedStudents(options);
  const subjectStats = calculateSubjectStats(students);
  return Object.values(subjectStats).map(({ values, ...subject }) => subject);
};

module.exports = {
  getStudentIds,
  getStudentById,
  getLeaderboard,
  getBatchStatistics,
  getSubjectAnalytics,
};
