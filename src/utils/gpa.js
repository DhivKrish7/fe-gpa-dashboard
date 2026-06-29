import { GRADE_SCALE, GPA_CREDIT_TOTAL } from '../constants/grades';
import { L1_COURSES } from '../constants/courses';

export const gradeToPoints = (grade) => {
  if (!grade || grade === '-' || grade === '') return null;
  return GRADE_SCALE.find((item) => item.label === grade)?.points ?? null;
};

export const normalizeGrade = (grade) => {
  if (typeof grade !== 'string') return '';
  const trimmed = grade.trim();
  return trimmed === '-' ? '-' : trimmed;
};

export const computeGPA = (grades, courses = L1_COURSES) => {
  let points = 0;
  let credits = 0;

  for (const course of courses) {
    if (course.nonGPA) continue;
    const pointsValue = gradeToPoints(normalizeGrade(grades?.[course.code]));
    if (pointsValue !== null) {
      points += pointsValue * course.credits;
      credits += course.credits;
    }
  }

  return {
    gpa: credits > 0 ? points / credits : null,
    credits,
  };
};

export const getGPAClassification = (gpa) => {
  if (gpa === null || Number.isNaN(gpa)) return { label: 'N/A', color: '#475569', bg: '#1e2236' };
  if (gpa >= 3.7) return { label: 'First Class', color: '#10b981', bg: '#064e3b22' };
  if (gpa >= 3.3) return { label: 'Second Upper', color: '#6366f1', bg: '#312e8122' };
  if (gpa >= 3.0) return { label: 'Second Lower', color: '#f59e0b', bg: '#78350f22' };
  if (gpa >= 2.0) return { label: 'Pass', color: '#94a3b8', bg: '#1e2940' };
  return { label: 'Below Pass', color: '#f87171', bg: '#450a0a22' };
};

export const calculateForecast = (currentGPA, currentCredits, targetGPA) => {
  if (currentCredits <= 0 || currentGPA === null) return null;
  const remainingCredits = GPA_CREDIT_TOTAL - currentCredits;
  if (remainingCredits <= 0) return currentGPA;
  return (currentGPA * currentCredits + targetGPA * remainingCredits) / GPA_CREDIT_TOTAL;
};

export const calculateNeededGPA = (currentGPA, currentCredits, targetGPA) => {
  if (currentCredits <= 0 || currentGPA === null) return null;
  const remainingCredits = GPA_CREDIT_TOTAL - currentCredits;
  if (remainingCredits <= 0) return currentGPA;
  return (targetGPA * GPA_CREDIT_TOTAL - currentGPA * currentCredits) / remainingCredits;
};

export const getRankedStudents = (rows, courses = L1_COURSES) => {
  const students = rows
    .map((row) => {
      const grades = Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'id'));
      const stats = computeGPA(grades, courses);
      return {
        id: row.id || row['Reg. No'] || row['Reg ID'] || '',
        gpa: stats.gpa,
        credits: stats.credits,
      };
    })
    .filter((student) => student.id && student.gpa !== null);

  const sorted = [...students].sort((a, b) => b.gpa - a.gpa);
  return sorted.map((student, index) => ({ ...student, rank: index + 1 }));
};
