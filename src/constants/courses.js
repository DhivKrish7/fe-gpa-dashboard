export const COURSES = {
  'Level I': {
    'Semester I': [
      { code: 'FE 1021', name: 'Python Programming', credits: 2 },
      { code: 'FE 1022', name: 'Economics I for Finance', credits: 2 },
      { code: 'FE 1023', name: 'Financial Statement Analysis & Reporting I', credits: 2 },
      { code: 'FE 1024', name: 'Spreadsheet Analysis', credits: 2 },
      { code: 'FE 1025', name: 'Financial Mathematics I', credits: 2 },
    ],
    'Semester II': [
      { code: 'FE 1026', name: 'Applied Calculus I', credits: 2 },
      { code: 'FE 1027', name: 'Economics II for Finance', credits: 2 },
      { code: 'FE 1028', name: 'Scientific Computing with Python', credits: 2 },
      { code: 'FE 1029', name: 'Data Visualization with Python', credits: 2 },
      { code: 'FE 1030', name: 'Professional English for Finance', credits: 2 },
    ],
    'Semester III': [
      { code: 'FE 1031', name: 'Linear Programming', credits: 2 },
      { code: 'FE 1032', name: 'Introduction to Probability Theory', credits: 2 },
      { code: 'FE 1033', name: 'Financial Analytics I', credits: 2 },
      { code: 'FE 1034', name: 'Computational Linear Algebra', credits: 2 },
      { code: 'FE 1035', name: 'Financial Mathematics II', credits: 2 },
    ],
  },
  'Level II': {
    'Semester I': [
      { code: 'FE 2021', name: 'Probability Distributions', credits: 2 },
      { code: 'FE 2022', name: 'Financial Analytics II', credits: 2 },
      { code: 'FE 2023', name: 'Quantitative Economics I', credits: 2 },
      { code: 'FE 2024', name: 'Applied Calculus II', credits: 2 },
      { code: 'FE 2025', name: 'Financial Markets & Instruments', credits: 2 },
    ],
    'Semester II': [
      { code: 'FE 2026', name: 'Financial Analytics III', credits: 2 },
      { code: 'FE 2027', name: 'Supply Chain Models', credits: 2 },
      { code: 'FE 2028', name: 'Quantitative Economics II', credits: 2 },
      { code: 'FE 2029', name: 'Financial Economics', credits: 2 },
      { code: 'FE 2030', name: 'Insurance for Financial Services', credits: 2 },
    ],
    'Semester III': [
      { code: 'FE 2031', name: 'Machine Learning in Financial Engineering', credits: 2 },
      { code: 'FE 2032', name: 'Financial Statements Analysis & Reporting II', credits: 2 },
      { code: 'FE 2033', name: 'Financial Economics & Analysis', credits: 2 },
      { code: 'FE 2034', name: 'Quantitative Financial Risk Analysis I', credits: 2 },
      { code: 'FE 2035', name: 'Survival Analysis', credits: 2 },
      { code: 'FE 2045', name: 'Corporate Finance & Issuers (Non-GPA)', credits: 2, nonGPA: true },
    ],
  },
  'Level III': {
    'Core Courses': [
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
    'Financial Analytics Stream': [
      { code: 'FE 3030', name: 'Case Studies in Financial Analytics', credits: 3 },
      { code: 'FE 3031', name: 'Professional Practice in Financial Analytics', credits: 3 },
      { code: 'FE 3032', name: 'Financial Analytics Project', credits: 6 },
    ],
    'Business Analysis Stream': [
      { code: 'FE 3033', name: 'Case Studies in Business Analysis', credits: 3 },
      { code: 'FE 3034', name: 'Professional Practice in Business Analysis', credits: 3 },
      { code: 'FE 3035', name: 'Business Analysis Project', credits: 6 },
    ],
    'BI Systems Stream': [
      { code: 'FE 3036', name: 'Case Studies in Business Intelligence Systems', credits: 3 },
      { code: 'FE 3037', name: 'Professional Practice in Business Intelligence Systems', credits: 3 },
      { code: 'FE 3038', name: 'Business Intelligence Systems Project', credits: 6 },
    ],
    Enhancement: [{ code: 'FE 3045', name: 'Ethical & Professional Standards (Non-GPA)', credits: 2, nonGPA: true }],
  },
};

export const SEM1_COURSES = COURSES['Level I']['Semester I'];
export const SEM2_COURSES = COURSES['Level I']['Semester II'];
export const SEM3_COURSES = COURSES['Level I']['Semester III'];
export const L1_COURSES = [...SEM1_COURSES, ...SEM2_COURSES, ...SEM3_COURSES];
export const L2_COURSES = Object.values(COURSES['Level II']).flat();
export const L3_CORE = Object.values(COURSES['Level III']).flat().filter((course) => !course.nonGPA);
export const ALL_CODES = [...new Set([...L1_COURSES, ...L2_COURSES, ...L3_CORE].map((course) => course.code))];
