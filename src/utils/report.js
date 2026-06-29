import { computeGPA, getGPAClassification } from './gpa';
import { L1_COURSES, SEM1_COURSES, SEM2_COURSES, SEM3_COURSES, L2_COURSES, L3_CORE } from '../constants/courses';

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
};

export const buildReportHTML = (studentId, grades, batchData, targetGPA) => {
  const s1 = computeGPA(grades, L1_COURSES.slice(0, 5));
  const s2 = computeGPA(grades, L1_COURSES.slice(5, 10));
  const s3 = computeGPA(grades, L1_COURSES.slice(10, 15));
  const l1 = computeGPA(grades, L1_COURSES);
  const cls = getGPAClassification(l1.gpa);

  const batchGPAs = batchData
    .map((row) => computeGPA(Object.fromEntries(Object.entries(row)), L1_COURSES).gpa)
    .filter((gpa) => gpa !== null)
    .sort((a, b) => b - a);

  const rank = l1.gpa !== null ? batchGPAs.findIndex((gpa) => gpa <= l1.gpa) + 1 : '—';
  const percentile = l1.gpa !== null && batchGPAs.length
    ? `${((batchGPAs.filter((gpa) => gpa < l1.gpa).length / batchGPAs.length) * 100).toFixed(1)}%`
    : '—';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>GPA Report - ${studentId}</title>
    <style>body{font-family:Segoe UI, sans-serif;padding:24px;color:#111827;} .header{background:linear-gradient(135deg,#1e1b4b,#312e81);color:white;padding:20px;border-radius:12px;} h1{margin:0;} .kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;} .card{border:1px solid #e5e7eb;border-radius:10px;padding:12px;} table{width:100%;border-collapse:collapse;margin-top:12px;} th{background:#f3f4f6;padding:8px;text-align:left;} td{padding:8px;border-bottom:1px solid #e5e7eb;} .footer{margin-top:16px;font-size:12px;color:#6b7280;}</style>
  </head>
  <body>
    <div class="header">
      <h1>BSc Financial Engineering GPA Report</h1>
      <p>Student ID: ${studentId}</p>
    </div>
    <div class="kpi">
      <div class="card"><strong>Level I GPA</strong><div>${l1.gpa !== null ? l1.gpa.toFixed(3) : '—'}</div></div>
      <div class="card"><strong>Classification</strong><div>${cls.label}</div></div>
      <div class="card"><strong>Batch Rank</strong><div>${rank}</div></div>
      <div class="card"><strong>Percentile</strong><div>${percentile}</div></div>
    </div>
    <h2>Semester Summary</h2>
    <table>
      <thead><tr><th>Semester</th><th>GPA</th><th>Credits</th></tr></thead>
      <tbody>
        <tr><td>Semester I</td><td>${s1.gpa !== null ? s1.gpa.toFixed(3) : '—'}</td><td>${s1.credits}</td></tr>
        <tr><td>Semester II</td><td>${s2.gpa !== null ? s2.gpa.toFixed(3) : '—'}</td><td>${s2.credits}</td></tr>
        <tr><td>Semester III</td><td>${s3.gpa !== null ? s3.gpa.toFixed(3) : '—'}</td><td>${s3.credits}</td></tr>
      </tbody>
    </table>
    <div class="footer">Generated on ${formatDate(Date.now())}</div>
  </body>
</html>`;
};
