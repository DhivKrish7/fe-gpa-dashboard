const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString();
};

const formatNumber = (value, digits = 3) => (value !== null && value !== undefined ? Number(value).toFixed(digits) : '-');
const formatPercent = (value, digits = 0) => (value !== null && value !== undefined ? `${Number(value).toFixed(digits)}%` : '-');

export const buildReportHTML = (student, batchStats) => {
  const stats = student?.stats || {};
  const overall = stats.overall || {};
  const classification = stats.degreeClassification || overall.classification || {};
  const semesters = (stats.semesters || []).filter((semester) => semester.level === 'Level I');
  const rank = stats.rank ? `${stats.rank} / ${stats.rankedStudentCount}` : '-';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>GPA Report - ${student?.id || 'Student'}</title>
    <style>body{font-family:Segoe UI,sans-serif;padding:24px;color:#111827}.header{background:linear-gradient(135deg,#1e1b4b,#312e81);color:white;padding:20px;border-radius:12px}h1{margin:0}.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.card{border:1px solid #e5e7eb;border-radius:10px;padding:12px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#f3f4f6;padding:8px;text-align:left}td{padding:8px;border-bottom:1px solid #e5e7eb}.footer{margin-top:16px;font-size:12px;color:#6b7280}</style>
  </head>
  <body>
    <div class="header">
      <h1>BSc Financial Engineering GPA Report</h1>
      <p>Student ID: ${student?.id || '-'}</p>
    </div>
    <div class="kpi">
      <div class="card"><strong>Overall GPA</strong><div>${formatNumber(overall.gpa)}</div></div>
      <div class="card"><strong>Classification</strong><div>${classification.label || 'N/A'}</div></div>
      <div class="card"><strong>Batch Rank</strong><div>${rank}</div></div>
      <div class="card"><strong>Percentile</strong><div>${formatPercent(stats.percentile)}</div></div>
    </div>
    <div class="kpi">
      <div class="card"><strong>Batch Average GPA</strong><div>${formatNumber(batchStats?.averageGpa)}</div></div>
      <div class="card"><strong>Academic Health</strong><div>${formatPercent(stats.academicHealth?.score)}</div></div>
      <div class="card"><strong>Consistency</strong><div>${formatPercent(stats.consistencyScore)}</div></div>
      <div class="card"><strong>Needed Per Credit</strong><div>${formatNumber(stats.forecast?.neededPerCredit, 2)}</div></div>
    </div>
    <h2>Semester Summary</h2>
    <table>
      <thead><tr><th>Semester</th><th>GPA</th><th>Credits</th><th>Class</th></tr></thead>
      <tbody>
        ${semesters.map((semester) => `<tr><td>${semester.label}</td><td>${formatNumber(semester.gpa)}</td><td>${semester.credits}</td><td>${semester.classification?.label || 'N/A'}</td></tr>`).join('')}
      </tbody>
    </table>
    <div class="footer">Generated on ${formatDate(Date.now())}</div>
  </body>
</html>`;
};
