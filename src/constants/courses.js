export const DEGREE_TOTAL_CREDITS = 90;
export const GPA_CREDIT_TOTAL = 90;

export const LEVEL_TOTAL_CREDITS = {
  'Level I': 30,
  'Level II': 30,
  'Level III': 30,
};

const withMetadata = (courses, metadata) =>
  courses.map((course) => ({
    ...course,
    level: metadata.level,
    year: metadata.year,
    semester: metadata.semester,
    semesterLabel: metadata.semesterLabel,
    group: metadata.group ?? null,
    gpaEligible: course.gpaEligible ?? !course.nonGPA,
    nonGPA: course.nonGPA ?? course.gpaEligible === false,
  }));

const level1Semester1 = withMetadata([
  { code: 'FE 1021', name: 'Python Programming', credits: 2 },
  { code: 'FE 1022', name: 'Economics I for Finance', credits: 2 },
  { code: 'FE 1023', name: 'Financial Statement Analysis & Reporting I', credits: 2 },
  { code: 'FE 1024', name: 'Spreadsheet Analysis', credits: 2 },
  { code: 'FE 1025', name: 'Financial Mathematics I', credits: 2 },
], { level: 1, year: 1, semester: 1, semesterLabel: 'Semester I' });

const level1Semester2 = withMetadata([
  { code: 'FE 1026', name: 'Applied Calculus I', credits: 2 },
  { code: 'FE 1027', name: 'Economics II for Finance', credits: 2 },
  { code: 'FE 1028', name: 'Scientific Computing with Python', credits: 2 },
  { code: 'FE 1029', name: 'Data Visualization with Python', credits: 2 },
  { code: 'FE 1030', name: 'Professional English for Finance', credits: 2 },
], { level: 1, year: 1, semester: 2, semesterLabel: 'Semester II' });

const level1Semester3 = withMetadata([
  { code: 'FE 1031', name: 'Linear Programming', credits: 2 },
  { code: 'FE 1032', name: 'Introduction to Probability Theory', credits: 2 },
  { code: 'FE 1033', name: 'Financial Analytics I', credits: 2 },
  { code: 'FE 1034', name: 'Computational Linear Algebra', credits: 2 },
  { code: 'FE 1035', name: 'Financial Mathematics II', credits: 2 },
], { level: 1, year: 1, semester: 3, semesterLabel: 'Semester III' });

const level2Semester1 = withMetadata([
  { code: 'FE 2021', name: 'Probability Distributions', credits: 2 },
  { code: 'FE 2022', name: 'Financial Analytics II', credits: 2 },
  { code: 'FE 2023', name: 'Quantitative Economics I', credits: 2 },
  { code: 'FE 2024', name: 'Applied Calculus II', credits: 2 },
  { code: 'FE 2025', name: 'Financial Markets & Instruments', credits: 2 },
], { level: 2, year: 2, semester: 1, semesterLabel: 'Semester I' });

const level2Semester2 = withMetadata([
  { code: 'FE 2026', name: 'Financial Analytics III', credits: 2 },
  { code: 'FE 2027', name: 'Supply Chain Models', credits: 2 },
  { code: 'FE 2028', name: 'Quantitative Economics II', credits: 2 },
  { code: 'FE 2029', name: 'Financial Economics', credits: 2 },
  { code: 'FE 2030', name: 'Insurance for Financial Services', credits: 2 },
], { level: 2, year: 2, semester: 2, semesterLabel: 'Semester II' });

const level2Semester3 = withMetadata([
  { code: 'FE 2031', name: 'Machine Learning in Financial Engineering', credits: 2 },
  { code: 'FE 2032', name: 'Financial Statements Analysis & Reporting II', credits: 2 },
  { code: 'FE 2033', name: 'Financial Economics & Analysis', credits: 2 },
  { code: 'FE 2034', name: 'Quantitative Financial Risk Analysis I', credits: 2 },
  { code: 'FE 2035', name: 'Survival Analysis', credits: 2 },
], { level: 2, year: 2, semester: 3, semesterLabel: 'Semester III' });

const level3Semester1 = withMetadata([
  { code: 'FE 3021', name: 'Investment Analysis', credits: 2 },
  { code: 'FE 3022', name: 'Artificial Intelligence in Financial Engineering', credits: 2 },
  { code: 'FE 3023', name: 'Portfolio Optimization I', credits: 2 },
  { code: 'FE 3024', name: 'Quantitative Financial Risk Analysis II', credits: 2 },
  { code: 'FE 3025', name: 'Life Insurance Models & Risk Analysis', credits: 2 },
], { level: 3, year: 3, semester: 1, semesterLabel: 'Semester I' });

const level3Semester2 = withMetadata([
  { code: 'FE 3026', name: 'Portfolio Optimization II', credits: 2 },
  { code: 'FE 3027', name: 'Financial Simulation Models', credits: 2 },
  { code: 'FE 3028', name: 'Quantitative Economics III', credits: 2 },
  { code: 'FE 3029', name: 'Banking & International Finance', credits: 2 },
], { level: 3, year: 3, semester: 2, semesterLabel: 'Semester II' });

export const LEVEL3_FINAL_GROUPS = [
  {
    id: 'financial_analytics',
    key: 'level3Semester3FinancialAnalytics',
    label: 'Financial Analytics',
    shortLabel: 'L3 FA',
    courses: withMetadata([
      { code: 'FE 3030', name: 'Case Studies in Financial Analytics', credits: 3 },
      { code: 'FE 3031', name: 'Professional Practice in Financial Analytics', credits: 3 },
      { code: 'FE 3032', name: 'Financial Analytics Project', credits: 6 },
    ], { level: 3, year: 3, semester: 3, semesterLabel: 'Semester III', group: 'financial_analytics' }),
  },
  {
    id: 'business_analysis',
    key: 'level3Semester3BusinessAnalysis',
    label: 'Business Analysis',
    shortLabel: 'L3 BA',
    courses: withMetadata([
      { code: 'FE 3033', name: 'Case Studies in Business Analysis', credits: 3 },
      { code: 'FE 3034', name: 'Professional Practice in Business Analysis', credits: 3 },
      { code: 'FE 3035', name: 'Business Analysis Project', credits: 6 },
    ], { level: 3, year: 3, semester: 3, semesterLabel: 'Semester III', group: 'business_analysis' }),
  },
  {
    id: 'business_intelligence_systems',
    key: 'level3Semester3BusinessIntelligenceSystems',
    label: 'Business Intelligence Systems',
    shortLabel: 'L3 BIS',
    courses: withMetadata([
      { code: 'FE 3036', name: 'Case Studies in Business Intelligence Systems', credits: 3 },
      { code: 'FE 3037', name: 'Professional Practice in Business Intelligence Systems', credits: 3 },
      { code: 'FE 3038', name: 'Business Intelligence Systems Project', credits: 6 },
    ], { level: 3, year: 3, semester: 3, semesterLabel: 'Semester III', group: 'business_intelligence_systems' }),
  },
];

export const BASE_SEMESTER_GROUPS = [
  { key: 'level1Semester1', label: 'Semester I', shortLabel: 'Sem I', level: 'Level I', year: 1, semester: 1, totalCredits: 10, courses: level1Semester1 },
  { key: 'level1Semester2', label: 'Semester II', shortLabel: 'Sem II', level: 'Level I', year: 1, semester: 2, totalCredits: 10, courses: level1Semester2 },
  { key: 'level1Semester3', label: 'Semester III', shortLabel: 'Sem III', level: 'Level I', year: 1, semester: 3, totalCredits: 10, courses: level1Semester3 },
  { key: 'level2Semester1', label: 'Level II Semester I', shortLabel: 'L2 Sem I', level: 'Level II', year: 2, semester: 1, totalCredits: 10, courses: level2Semester1 },
  { key: 'level2Semester2', label: 'Level II Semester II', shortLabel: 'L2 Sem II', level: 'Level II', year: 2, semester: 2, totalCredits: 10, courses: level2Semester2 },
  { key: 'level2Semester3', label: 'Level II Semester III', shortLabel: 'L2 Sem III', level: 'Level II', year: 2, semester: 3, totalCredits: 10, courses: level2Semester3 },
  { key: 'level3Semester1', label: 'Level III Semester I', shortLabel: 'L3 Sem I', level: 'Level III', year: 3, semester: 1, totalCredits: 10, courses: level3Semester1 },
  { key: 'level3Semester2', label: 'Level III Semester II', shortLabel: 'L3 Sem II', level: 'Level III', year: 3, semester: 2, totalCredits: 8, courses: level3Semester2 },
];

export const LEVEL3_FINAL_PLACEHOLDER_GROUP = {
  key: 'level3Semester3Unselected',
  label: 'Level III Semester III',
  shortLabel: 'L3 Sem III',
  level: 'Level III',
  year: 3,
  semester: 3,
  totalCredits: 12,
  courses: [],
  specializationRequired: true,
};

export const getLevel3FinalSemesterGroup = (groupId) => {
  const option = LEVEL3_FINAL_GROUPS.find((group) => group.id === groupId);
  if (!option) return LEVEL3_FINAL_PLACEHOLDER_GROUP;

  return {
    key: option.key,
    label: `Level III Semester III - ${option.label}`,
    shortLabel: option.shortLabel,
    level: 'Level III',
    year: 3,
    semester: 3,
    totalCredits: 12,
    group: option.id,
    groupLabel: option.label,
    courses: option.courses,
  };
};

export const getSemesterGroupsForSpecialization = (groupId = null) => [
  ...BASE_SEMESTER_GROUPS,
  getLevel3FinalSemesterGroup(groupId),
];

export const COURSE_CATALOG = [
  ...BASE_SEMESTER_GROUPS.flatMap((group) => group.courses),
  ...LEVEL3_FINAL_GROUPS.flatMap((group) => group.courses),
];

export const COURSE_BY_CODE = Object.fromEntries(COURSE_CATALOG.map((course) => [course.code, course]));
export const LEVEL3_FINAL_GROUP_BY_CODE = Object.fromEntries(
  LEVEL3_FINAL_GROUPS.flatMap((group) => group.courses.map((course) => [course.code, group]))
);

export const COURSE_STRUCTURE = {
  levels: [
    { level: 'Level I', year: 1, totalCredits: 30, semesters: BASE_SEMESTER_GROUPS.filter((group) => group.level === 'Level I') },
    { level: 'Level II', year: 2, totalCredits: 30, semesters: BASE_SEMESTER_GROUPS.filter((group) => group.level === 'Level II') },
    {
      level: 'Level III',
      year: 3,
      totalCredits: 30,
      semesters: [
        ...BASE_SEMESTER_GROUPS.filter((group) => group.level === 'Level III'),
        { ...LEVEL3_FINAL_PLACEHOLDER_GROUP, alternatives: LEVEL3_FINAL_GROUPS },
      ],
    },
  ],
};

const sumCredits = (courses) => courses.reduce((sum, course) => sum + course.credits, 0);

export const validateCourseStructure = () => {
  const issues = [];
  const assertCredits = (label, actual, expected) => {
    if (actual !== expected) issues.push(`${label} expected ${expected}C but found ${actual}C.`);
  };

  assertCredits('Level I', BASE_SEMESTER_GROUPS.filter((group) => group.level === 'Level I').reduce((sum, group) => sum + sumCredits(group.courses), 0), 30);
  assertCredits('Level II', BASE_SEMESTER_GROUPS.filter((group) => group.level === 'Level II').reduce((sum, group) => sum + sumCredits(group.courses), 0), 30);
  assertCredits('Level III Semester I', sumCredits(level3Semester1), 10);
  assertCredits('Level III Semester II', sumCredits(level3Semester2), 8);
  LEVEL3_FINAL_GROUPS.forEach((group) => assertCredits(`Level III Semester III ${group.label}`, sumCredits(group.courses), 12));
  assertCredits('Level III', sumCredits(level3Semester1) + sumCredits(level3Semester2) + 12, 30);
  assertCredits('Degree', 30 + 30 + 30, DEGREE_TOTAL_CREDITS);

  return { valid: issues.length === 0, issues };
};

export const COURSES = {
  'Level I': {
    'Semester I': level1Semester1,
    'Semester II': level1Semester2,
    'Semester III': level1Semester3,
  },
  'Level II': {
    'Semester I': level2Semester1,
    'Semester II': level2Semester2,
    'Semester III': level2Semester3,
  },
  'Level III': {
    'Semester I': level3Semester1,
    'Semester II': level3Semester2,
    'Semester III': LEVEL3_FINAL_GROUPS,
  },
};

export const SEM1_COURSES = level1Semester1;
export const SEM2_COURSES = level1Semester2;
export const SEM3_COURSES = level1Semester3;
export const L1_COURSES = [...SEM1_COURSES, ...SEM2_COURSES, ...SEM3_COURSES];
export const L2_COURSES = [...level2Semester1, ...level2Semester2, ...level2Semester3];
export const L3_CORE = [...level3Semester1, ...level3Semester2];
export const ALL_CODES = COURSE_CATALOG.map((course) => course.code);
