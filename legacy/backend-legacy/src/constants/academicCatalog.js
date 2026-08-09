const GRADE_SCALE = [
  { label: 'A+', points: 4.0 },
  { label: 'A', points: 4.0 },
  { label: 'A-', points: 3.7 },
  { label: 'B+', points: 3.3 },
  { label: 'B', points: 3.0 },
  { label: 'B-', points: 2.7 },
  { label: 'C+', points: 2.3 },
  { label: 'C', points: 2.0 },
  { label: 'C-', points: 1.7 },
  { label: 'D+', points: 1.3 },
  { label: 'D', points: 1.0 },
  { label: 'E', points: 0.0 },
];

const VALID_GRADES = new Set([...GRADE_SCALE.map((grade) => grade.label), '-', 'ABS']);
const GPA_CREDIT_TOTAL = 88;
const DEGREE_TOTAL_CREDITS = 90;

const SEMESTER_GROUPS = [
  {
    key: 'level1Semester1',
    label: 'Semester I',
    shortLabel: 'Sem I',
    level: 'Level I',
    courses: [
      { code: 'FE 1021', name: 'Python Programming', credits: 2 },
      { code: 'FE 1022', name: 'Economics I for Finance', credits: 2 },
      { code: 'FE 1023', name: 'Financial Statement Analysis & Reporting I', credits: 2 },
      { code: 'FE 1024', name: 'Spreadsheet Analysis', credits: 2 },
      { code: 'FE 1025', name: 'Financial Mathematics I', credits: 2 },
    ],
  },
  {
    key: 'level1Semester2',
    label: 'Semester II',
    shortLabel: 'Sem II',
    level: 'Level I',
    courses: [
      { code: 'FE 1026', name: 'Applied Calculus I', credits: 2 },
      { code: 'FE 1027', name: 'Economics II for Finance', credits: 2 },
      { code: 'FE 1028', name: 'Scientific Computing with Python', credits: 2 },
      { code: 'FE 1029', name: 'Data Visualization with Python', credits: 2 },
      { code: 'FE 1030', name: 'Professional English for Finance', credits: 2 },
    ],
  },
  {
    key: 'level1Semester3',
    label: 'Semester III',
    shortLabel: 'Sem III',
    level: 'Level I',
    editable: true,
    courses: [
      { code: 'FE 1031', name: 'Linear Programming', credits: 2 },
      { code: 'FE 1032', name: 'Introduction to Probability Theory', credits: 2 },
      { code: 'FE 1033', name: 'Financial Analytics I', credits: 2 },
      { code: 'FE 1034', name: 'Computational Linear Algebra', credits: 2 },
      { code: 'FE 1035', name: 'Financial Mathematics II', credits: 2 },
      { code: 'FE 1045', name: 'Basic Mathematics (Non-GPA)', credits: 2, nonGPA: true },
    ],
  },
  {
    key: 'level2Semester1',
    label: 'Level II Semester I',
    shortLabel: 'L2 Sem I',
    level: 'Level II',
    courses: [
      { code: 'FE 2021', name: 'Probability Distributions', credits: 2 },
      { code: 'FE 2022', name: 'Financial Analytics II', credits: 2 },
      { code: 'FE 2023', name: 'Quantitative Economics I', credits: 2 },
      { code: 'FE 2024', name: 'Applied Calculus II', credits: 2 },
      { code: 'FE 2025', name: 'Financial Markets & Instruments', credits: 2 },
    ],
  },
  {
    key: 'level2Semester2',
    label: 'Level II Semester II',
    shortLabel: 'L2 Sem II',
    level: 'Level II',
    courses: [
      { code: 'FE 2026', name: 'Financial Analytics III', credits: 2 },
      { code: 'FE 2027', name: 'Supply Chain Models', credits: 2 },
      { code: 'FE 2028', name: 'Quantitative Economics II', credits: 2 },
      { code: 'FE 2029', name: 'Financial Economics', credits: 2 },
      { code: 'FE 2030', name: 'Insurance for Financial Services', credits: 2 },
    ],
  },
  {
    key: 'level2Semester3',
    label: 'Level II Semester III',
    shortLabel: 'L2 Sem III',
    level: 'Level II',
    courses: [
      { code: 'FE 2031', name: 'Machine Learning in Financial Engineering', credits: 2 },
      { code: 'FE 2032', name: 'Financial Statements Analysis & Reporting II', credits: 2 },
      { code: 'FE 2033', name: 'Financial Economics & Analysis', credits: 2 },
      { code: 'FE 2034', name: 'Quantitative Financial Risk Analysis I', credits: 2 },
      { code: 'FE 2035', name: 'Survival Analysis', credits: 2 },
      { code: 'FE 2045', name: 'Corporate Finance & Issuers (Non-GPA)', credits: 2, nonGPA: true },
    ],
  },
  {
    key: 'level3Core',
    label: 'Level III Core',
    shortLabel: 'L3 Core',
    level: 'Level III',
    courses: [
      { code: 'FE 3021', name: 'Investment Analysis', credits: 2 },
      { code: 'FE 3022', name: 'Artificial Intelligence in Financial Engineering', credits: 2 },
      { code: 'FE 3023', name: 'Portfolio Optimization I', credits: 2 },
      { code: 'FE 3024', name: 'Quantitative Financial Risk Analysis II', credits: 2 },
      { code: 'FE 3025', name: 'Life Insurance Models & Risk Analysis', credits: 2 },
      { code: 'FE 3026', name: 'Portfolio Optimization II', credits: 2 },
      { code: 'FE 3027', name: 'Financial Simulation Models', credits: 2 },
      { code: 'FE 3028', name: 'Quantitative Economics III', credits: 2 },
      { code: 'FE 3029', name: 'Banking & International Finance', credits: 2 },
    ],
  },
  {
    key: 'level3FinancialAnalytics',
    label: 'Financial Analytics Stream',
    shortLabel: 'FA Stream',
    level: 'Level III',
    courses: [
      { code: 'FE 3030', name: 'Case Studies in Financial Analytics', credits: 3 },
      { code: 'FE 3031', name: 'Professional Practice in Financial Analytics', credits: 3 },
      { code: 'FE 3032', name: 'Financial Analytics Project', credits: 6 },
    ],
  },
  {
    key: 'level3BusinessAnalysis',
    label: 'Business Analysis Stream',
    shortLabel: 'BA Stream',
    level: 'Level III',
    courses: [
      { code: 'FE 3033', name: 'Case Studies in Business Analysis', credits: 3 },
      { code: 'FE 3034', name: 'Professional Practice in Business Analysis', credits: 3 },
      { code: 'FE 3035', name: 'Business Analysis Project', credits: 6 },
    ],
  },
  {
    key: 'level3BiSystems',
    label: 'BI Systems Stream',
    shortLabel: 'BI Stream',
    level: 'Level III',
    courses: [
      { code: 'FE 3036', name: 'Case Studies in Business Intelligence Systems', credits: 3 },
      { code: 'FE 3037', name: 'Professional Practice in Business Intelligence Systems', credits: 3 },
      { code: 'FE 3038', name: 'Business Intelligence Systems Project', credits: 6 },
      { code: 'FE 3045', name: 'Ethical & Professional Standards (Non-GPA)', credits: 2, nonGPA: true },
    ],
  },
];

const COURSES = SEMESTER_GROUPS.flatMap((group) => group.courses);
const LEVEL_ONE_COURSES = SEMESTER_GROUPS
  .filter((group) => group.level === 'Level I')
  .flatMap((group) => group.courses);
const GPA_COURSES = COURSES.filter((course) => !course.nonGPA);

const REQUIRED_GRADE_COLUMNS = [
  'FE 1021',
  'FE 1022',
  'FE 1023',
  'FE 1024',
  'FE 1025',
  'FE 1026',
  'FE 1027',
  'FE 1028',
  'FE 1029',
  'FE 1030',
];

const COURSE_CREDITS = COURSES.reduce((accumulator, course) => {
  accumulator[course.code] = course.credits;
  return accumulator;
}, {});

const GRADE_POINTS = GRADE_SCALE.reduce((accumulator, grade) => {
  accumulator[grade.label] = grade.points;
  return accumulator;
}, {});

module.exports = {
  COURSE_CREDITS,
  COURSES,
  DEGREE_TOTAL_CREDITS,
  GPA_COURSES,
  GPA_CREDIT_TOTAL,
  GRADE_POINTS,
  GRADE_SCALE,
  LEVEL_ONE_COURSES,
  REQUIRED_GRADE_COLUMNS,
  SEMESTER_GROUPS,
  VALID_GRADES,
};
