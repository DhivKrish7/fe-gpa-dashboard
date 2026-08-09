import { useEffect, useMemo, useState } from 'react';
import { DashboardHeader } from './components/layout/DashboardHeader';
import { StudentSelector } from './components/dashboard/StudentSelector';
import { KpiGrid } from './components/dashboard/KpiGrid';
import { Card, CardHeader } from './components/common/Card';
import { GPATrendChart } from './components/charts/GPATrendChart';
import { BatchDistributionChart } from './components/charts/BatchDistributionChart';
import { SubjectComparisonChart } from './components/charts/SubjectComparisonChart';
import { useDashboardData } from './hooks/useDashboardData';
import { buildReportHTML } from './utils/report';
import { GRADE_COLORS, GRADE_SCALE } from './constants/grades';

const DEFAULT_ERROR_MESSAGE = 'Unable to load GPA data. Please try again later.';

const T = {
  bg: '#0f1117', card: '#1a1d2e', border: '#2d3148',
  muted: '#64748b', dim: '#475569', text: '#e2e8f0', sub: '#94a3b8',
};

const gradeColor   = (grade) => GRADE_COLORS[grade] || '#475569';
const formatNumber = (value, digits = 3) => (value !== null && value !== undefined ? Number(value).toFixed(digits) : '-');
const formatPercent = (value, digits = 0) => (value !== null && value !== undefined ? `${Number(value).toFixed(digits)}%` : '-');
const round = (value, digits = 3) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(Number(value).toFixed(digits));
};
const gradeToPoints = (grade) => {
  if (!grade) return null;
  return GRADE_SCALE.find((entry) => entry.label === grade)?.points ?? null;
};

export default function App() {
  const [studentId, setStudentId] = useState('');
  const [userGrades, setUserGrades]   = useState({});
  const [whatIfGrades, setWhatIfGrades] = useState({});
  const [activeTab, setActiveTab]     = useState('results');
  const [subjectChartType, setSubjectChartType] = useState('bar');
  const targetGPA = 3.7;

  const {
    batchStats, loading, error,
    lastSyncedAt, lastUpdatedAt, allIds, rankedStudents,
    selectedStudent, refreshData,
  } = useDashboardData(studentId, { targetGPA, overrides: userGrades });

  const stats       = selectedStudent?.stats || null;
  const analytics   = selectedStudent?.analytics || null;
  const overall     = stats?.overall || {};
  const classification = stats?.degreeClassification || overall.classification || {};
  const forecast    = stats?.forecast || {};
  const levelOneSemesters = (stats?.semesters || []).filter((s) => s.level === 'Level I');
  const refreshStatus = loading ? 'Updating…' : error ? 'Unable to refresh' : 'Live results';
  const lastUpdatedLabel = lastUpdatedAt ? `Results last updated: ${new Date(lastUpdatedAt).toLocaleString()}` : lastSyncedAt ? `Last sync: ${new Date(lastSyncedAt).toLocaleString()}` : null;
  const semesterChartData = selectedStudent?.charts?.semesterTrend || [];
  const subjectChartData  = selectedStudent?.charts?.subjectComparison || [];
  const histogramData     = batchStats?.distribution || [];
  const batchAverageGpa   = typeof batchStats?.averageGpa === 'number' ? batchStats.averageGpa : null;
  const batchMedianGpa    = typeof batchStats?.medianGpa === 'number' ? batchStats.medianGpa : null;
  const batchPassRate     = typeof batchStats?.passRate === 'number' ? batchStats.passRate : null;
  const batchFailRate     = typeof batchStats?.failRate === 'number' ? batchStats.failRate : null;
  const batchDataAvailable = batchStats !== null && typeof batchStats === 'object';

  const setGrade = (code, grade) =>
    setUserGrades((prev) => ({ ...prev, [code]: grade }));

  const setWhatIfGrade = (code, grade) =>
    setWhatIfGrades((prev) => ({ ...prev, [code]: grade }));

  const remainingCourses = useMemo(() => {
    const semesters = selectedStudent?.stats?.semesters || [];
    return semesters.flatMap((sem) =>
      (sem?.courses || []).filter((course) => !course.nonGPA && course.points === null)
    );
  }, [selectedStudent]);

  const whatIfSimulation = useMemo(() => {
    if (!selectedStudent) return { currentGpa: null, projectedGpa: null, selectedCredits: 0, selectedEntries: [], delta: null };

    const semesters = selectedStudent?.stats?.semesters || [];
    const gradedCourses = semesters.flatMap((sem) =>
      (sem?.courses || []).filter((course) => !course.nonGPA && course.points !== null)
    );

    const currentQuality = gradedCourses.reduce((sum, course) => sum + course.points * course.credits, 0);
    const currentCredits = gradedCourses.reduce((sum, course) => sum + course.credits, 0);

    const selectedEntries = remainingCourses
      .map((course) => ({
        ...course,
        selectedGrade: whatIfGrades[course.code] || '',
        selectedPoints: gradeToPoints(whatIfGrades[course.code]),
      }))
      .filter((course) => course.selectedGrade);

    const selectedQuality = selectedEntries.reduce((sum, course) => sum + (course.selectedPoints ?? 0) * course.credits, 0);
    const selectedCredits = selectedEntries.reduce((sum, course) => sum + course.credits, 0);

    const projectedQuality = currentQuality + selectedQuality;
    const projectedCredits = currentCredits + selectedCredits;
    const currentGpa = currentCredits > 0 ? round(currentQuality / currentCredits) : null;
    const projectedGpa = projectedCredits > 0 ? round(projectedQuality / projectedCredits) : null;
    const delta = currentGpa !== null && projectedGpa !== null ? round(projectedGpa - currentGpa) : null;

    return {
      currentGpa,
      projectedGpa,
      selectedCredits,
      selectedEntries,
      delta,
    };
  }, [selectedStudent, remainingCourses, whatIfGrades]);

  const batchSemesterAverages = useMemo(() => {
    const students = batchStats?.students || [];
    const totals = {};
    const counts = {};
    students.forEach((student) => {
      if (!selectedStudent || student.id === selectedStudent.id) return;
      const semesterGpas = student.semesterGpas || {};
      Object.entries(semesterGpas).forEach(([key, gpa]) => {
        if (gpa !== null && gpa !== undefined) {
          totals[key] = (totals[key] || 0) + gpa;
          counts[key] = (counts[key] || 0) + 1;
        }
      });
    });
    return Object.fromEntries(
      Object.entries(totals).map(([key, total]) => [key, round(total / counts[key])])
    );
  }, [batchStats?.students, selectedStudent?.id]);

  const semesterComparisonRows = useMemo(() => {
    const semesters = selectedStudent?.stats?.semesters || [];
    return semesters.map((sem) => {
      const batchAvg = batchSemesterAverages[sem.key] ?? null;
      const diff = sem.gpa !== null && batchAvg !== null ? round(sem.gpa - batchAvg) : null;
      return {
        key: sem.key,
        label: sem.label,
        studentGpa: sem.gpa,
        batchAvg,
        diff,
      };
    });
  }, [selectedStudent, batchSemesterAverages]);

  const subjectRelativeInsights = useMemo(() => {
    const comparisons = subjectChartData
      .filter((item) => item.me !== null && item.batch !== null)
      .map((item) => ({ ...item, diff: round(item.me - item.batch) }));

    if (!comparisons.length) return { best: null, worst: null };

    const best = comparisons.reduce((acc, item) => (acc === null || item.diff > acc.diff ? item : acc), null);
    const worst = comparisons.reduce((acc, item) => (acc === null || item.diff < acc.diff ? item : acc), null);
    return { best, worst };
  }, [subjectChartData]);

  useEffect(() => {
    setWhatIfGrades({});
  }, [selectedStudent?.id]);

  const batchGpaDiff = overall.gpa !== null && batchAverageGpa !== null
    ? round(overall.gpa - batchAverageGpa)
    : null;

  const handleResetWhatIf = () => {
    setWhatIfGrades({});
  };

  const handleSelectStudent = (id) => {
    setStudentId(id);
    setUserGrades({});
    setActiveTab('results');
  };

  const handleExport = () => {
    if (!selectedStudent) return;
    const html = buildReportHTML(selectedStudent, batchStats);
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) { window.alert('Popup blocked. Please allow popups to export.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, minHeight: '100vh', color: T.text }}>
      <DashboardHeader
        onExport={handleExport}
        canExport={Boolean(selectedStudent)}
      />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px' }}>

        {/* ── Toolbar row ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={() => refreshData()}
            style={{ background: '#1e2236', border: '1px solid #2d3148', color: '#c7d2fe', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
          >
            Refresh Data
          </button>
        </div>

        {/* ── Student selector ── */}
        <StudentSelector
          onSelectStudent={handleSelectStudent}
          selectedStudentId={studentId}
          allIds={allIds}
          loading={loading}
          error={error}
        />

<div style={{ fontSize: 11, color: '#475569', marginBottom: 18, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>{refreshStatus}</span>
              {lastUpdatedLabel && <span>{lastUpdatedLabel}</span>}
              <span>Auto-refresh: every 5 minutes</span>
            </div>

        {/* ── Main content ── */}
        {loading && !selectedStudent && !error ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: T.muted }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⟳</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Loading dashboard…</div>
          </div>

        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#f87171' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{DEFAULT_ERROR_MESSAGE}</div>
            <div style={{ fontSize: 13, marginTop: 8, color: T.muted }}>{error}</div>
          </div>

        ) : !studentId ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Select your Registration ID above to view your GPA dashboard
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {allIds.length > 0
                ? `${allIds.length} students loaded from database`
                : 'Loading batch data…'}
            </div>
          </div>

        ) : !selectedStudent ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {loading ? 'Loading student analytics…' : 'Student data unavailable'}
            </div>
          </div>

        ) : (
          <>
            {/* KPIs */}
            <KpiGrid metrics={[
              { label: 'Overall GPA',    value: formatNumber(overall.gpa), color: classification.color || '#475569', sub: classification.label || 'N/A' },
              { label: 'Batch Rank',     value: stats.rank ? `${stats.rank} / ${stats.rankedStudentCount}` : '-', color: '#6366f1', sub: 'of graded students' },
              { label: 'Percentile',     value: formatPercent(stats.percentile), color: '#10b981', sub: 'relative standing' },
              { label: 'Batch Avg GPA',  value: batchAverageGpa !== null ? formatNumber(batchAverageGpa) : 'Batch average unavailable', color: '#f59e0b', sub: 'for comparison' },
              { label: 'Credits Earned', value: overall.credits ?? 0, color: '#60a5fa', sub: `of ${stats.gpaCreditTotal} GPA credits` },
              { label: 'Forecast Status', value: forecast.status === 'guaranteed' ? 'Secured' : forecast.status === 'impossible' ? 'Impossible' : 'Open', color: forecast.status === 'guaranteed' ? '#10b981' : forecast.status === 'impossible' ? '#f87171' : '#6366f1', sub: 'First Class forecast' },
            ]} />

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: `1px solid ${T.border}` }}>
              {[['results', '📋 Grades & Results'], ['forecast', '📈 Forecast'], ['batch', '👥 Batch Analysis']].map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  background: activeTab === tab ? '#6366f1' : 'transparent',
                  border: 'none', borderRadius: '8px 8px 0 0',
                  color: activeTab === tab ? '#fff' : T.muted,
                  padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>

            {/* ══ RESULTS ══ */}
            {activeTab === 'results' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                  {levelOneSemesters.map((sem) => {
                    const c = sem.classification || {};
                    return (
                      <Card key={sem.key} style={{ padding: '16px 20px', borderTop: `3px solid ${c.color || T.border}` }}>
                        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.1em' }}>{sem.label}</div>
                        <div style={{ fontSize: 32, fontWeight: 800, color: c.color || T.dim, margin: '6px 0 2px' }}>{formatNumber(sem.gpa)}</div>
                        <div style={{ fontSize: 12, color: c.color || T.dim }}>{c.label || 'N/A'}</div>
                        <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>{sem.credits}C graded of {sem.totalCredits}C</div>
                      </Card>
                    );
                  })}
                </div>

                <Card>
                  <CardHeader title="GPA Trend — Level I" subtitle="Actual performance vs target" />
                  <div style={{ padding: '16px 20px 8px' }}>
                    <GPATrendChart data={semesterChartData} targetGPA={forecast.targetGPA ?? targetGPA} />
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Academic Insights" subtitle="Performance summary" />
                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Strongest Subject', value: analytics?.strongestSubject?.code || '-', color: '#10b981' },
                      { label: 'Weakest Subject',   value: analytics?.weakestSubject?.code   || '-', color: '#f87171' },
                      { label: 'Consistency Score', value: formatPercent(analytics?.consistencyScore), color: '#6366f1' },
                      { label: 'Academic Health',   value: formatPercent(analytics?.academicHealth?.score), color: '#fbbf24' },
                    ].map((item) => (
                      <div key={item.label} style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>{item.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: item.color, marginTop: 4 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <CardHeader title="You vs Batch" subtitle="Your GPA against the cohort" />
                  <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Your GPA', value: formatNumber(overall.gpa), color: '#60a5fa' },
                      { label: 'Batch GPA', value: batchAverageGpa !== null ? formatNumber(batchAverageGpa) : 'Unavailable', color: '#f59e0b' },
                      { label: 'Difference', value: batchGpaDiff !== null ? `${batchGpaDiff >= 0 ? '+' : ''}${formatNumber(batchGpaDiff)}` : 'Unavailable', color: batchGpaDiff !== null ? (batchGpaDiff >= 0 ? '#10b981' : '#f87171') : T.sub },
                    ].map((item) => (
                      <div key={item.label} style={{ background: '#0f1117', borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>{item.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: item.color, marginTop: 8 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 18 }}>
                    <div style={{ background: '#0f1117', borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Best Relative Subject</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981', marginTop: 8 }}>{subjectRelativeInsights.best?.name || '-'}</div>
                      <div style={{ fontSize: 12, color: T.sub, marginTop: 6 }}>{subjectRelativeInsights.best ? `${subjectRelativeInsights.best.diff >= 0 ? '+' : ''}${subjectRelativeInsights.best.diff} above batch` : 'No comparison data'}</div>
                    </div>
                    <div style={{ background: '#0f1117', borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Most Challenging Subject</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#f87171', marginTop: 8 }}>{subjectRelativeInsights.worst?.name || '-'}</div>
                      <div style={{ fontSize: 12, color: T.sub, marginTop: 6 }}>{subjectRelativeInsights.worst ? `${subjectRelativeInsights.worst.diff >= 0 ? '+' : ''}${subjectRelativeInsights.worst.diff} vs batch` : 'No comparison data'}</div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHeader title="What If?" subtitle="Simulate remaining credits with target grades" />
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      {[
                        { label: 'Current GPA', value: formatNumber(whatIfSimulation.currentGpa), color: '#60a5fa' },
                        { label: 'Selected Credits', value: `${whatIfSimulation.selectedCredits}C`, color: '#a78bfa' },
                        { label: 'Projected GPA', value: whatIfSimulation.projectedGpa !== null ? formatNumber(whatIfSimulation.projectedGpa, 3) : '-', color: '#fbbf24' },
                        { label: 'GPA Change', value: whatIfSimulation.delta !== null ? `${whatIfSimulation.delta >= 0 ? '+' : ''}${formatNumber(whatIfSimulation.delta, 3)}` : '-', color: whatIfSimulation.delta >= 0 ? '#10b981' : '#f87171' },
                      ].map((item) => (
                        <div key={item.label} style={{ background: '#0f1117', borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>{item.label}</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: item.color, marginTop: 8 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, color: T.sub }}>Choose grades for your remaining GPA subjects to preview the impact on your cumulative performance.</div>
                      <button
                        type="button"
                        onClick={handleResetWhatIf}
                        style={{ background: '#1e2236', border: '1px solid #2d3148', color: '#c7d2fe', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12 }}
                      >
                        Reset selections
                      </button>
                    </div>
                    <div style={{ overflowX: 'auto', marginTop: 16 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                            {['Course', 'Credits', 'Select Grade', 'Projected Points'].map((h) => (
                              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: T.dim, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {remainingCourses.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ padding: '18px 14px', fontSize: 13, color: T.muted }}>No remaining GPA subjects available for simulation.</td>
                            </tr>
                          ) : remainingCourses.map((course, idx) => {
                            const selectedGrade = whatIfGrades[course.code] || '';
                            const selectedPoints = gradeToPoints(selectedGrade);
                            return (
                              <tr key={course.code} style={{ borderBottom: `1px solid ${T.border}22`, background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                                <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{course.code} · {course.name}</td>
                                <td style={{ padding: '10px 14px', fontSize: 12, color: T.sub }}>{course.credits}C</td>
                                <td style={{ padding: '10px 14px' }}>
                                  <select
                                    value={selectedGrade}
                                    onChange={(e) => setWhatIfGrade(course.code, e.target.value)}
                                    style={{ background: selectedGrade ? `${gradeColor(selectedGrade)}22` : '#0f1117', border: `1px solid ${selectedGrade ? `${gradeColor(selectedGrade)}66` : T.border}`, borderRadius: 6, color: selectedGrade ? gradeColor(selectedGrade) : T.muted, padding: '6px 10px', outline: 'none', cursor: 'pointer' }}
                                  >
                                    <option value="">Select</option>
                                    {GRADE_SCALE.map((g) => <option key={g.label} value={g.label}>{g.label}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: selectedPoints !== null ? gradeColor(selectedGrade) : T.border }}>
                                  {selectedPoints !== null ? formatNumber(selectedPoints, 2) : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>

                {levelOneSemesters.map((sem) => (
                  <Card key={sem.key}>
                    <CardHeader
                      title={`${sem.label} — ${sem.courses[0]?.code || ''} to ${sem.courses.filter((c) => !c.nonGPA).at(-1)?.code || ''}`}
                      subtitle={sem.editable ? 'Editable' : 'Locked from database'}
                    />
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          {['Code', 'Course', 'Cr', 'Grade', 'Pts', 'Total'].map((h) => (
                            <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: T.dim, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sem.courses.map((course, idx) => {
                          const absent   = course.grade === '-';
                          const editable = course.editable && !course.nonGPA;
                          return (
                            <tr key={course.code} style={{ borderBottom: `1px solid ${T.border}22`, background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                              <td style={{ padding: '9px 16px', fontSize: 12, color: T.muted, fontFamily: 'monospace' }}>{course.code}</td>
                              <td style={{ padding: '9px 16px', fontSize: 13, color: T.text }}>{course.name}</td>
                              <td style={{ padding: '9px 16px', fontSize: 12, color: T.sub }}>{course.credits}C</td>
                              <td style={{ padding: '9px 16px' }}>
                                {editable ? (
                                  <select
                                    value={course.grade || ''}
                                    onChange={(e) => setGrade(course.code, e.target.value)}
                                    style={{ background: course.grade && course.grade !== '-' ? `${gradeColor(course.grade)}22` : '#0f1117', border: `1px solid ${course.grade && course.grade !== '-' ? `${gradeColor(course.grade)}66` : T.border}`, borderRadius: 6, color: course.grade ? gradeColor(course.grade) : T.muted, padding: '4px 8px', outline: 'none', cursor: 'pointer' }}
                                  >
                                    <option value="">-</option>
                                    <option value="-">ABS</option>
                                    {GRADE_SCALE.map((g) => <option key={g.label} value={g.label}>{g.label}</option>)}
                                  </select>
                                ) : (
                                  <span style={{ fontWeight: 700, color: absent ? '#ef4444' : course.points !== null ? gradeColor(course.grade) : T.dim }}>
                                    {absent ? 'ABS' : course.grade || '-'}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 600, color: course.points !== null ? gradeColor(course.grade) : T.border }}>
                                {course.points !== null ? formatNumber(course.points, 2) : '-'}
                              </td>
                              <td style={{ padding: '9px 16px', fontSize: 13, color: course.totalPoints !== null ? T.text : T.border }}>
                                {course.totalPoints !== null ? formatNumber(course.totalPoints, 2) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Card>
                ))}
              </div>
            )}

            {/* ══ FORECAST ══ */}
            {activeTab === 'forecast' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card>
                  <CardHeader title="First Class Forecast" subtitle={`Target GPA ${formatNumber(forecast.targetGPA ?? targetGPA, 2)}`} />
                  <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Current GPA', value: formatNumber(forecast.currentGPA, 2), color: '#60a5fa', sub: `Completed ${forecast.completedCredits ?? 0} GPA credits` },
                      { label: 'Remaining GPA Credits', value: forecast.remainingCredits ?? 0, color: '#a78bfa', sub: `${forecast.remainingSubjects ?? 0} remaining subjects` },
                      { label: 'Target GPA', value: formatNumber(forecast.targetGPA ?? targetGPA, 2), color: '#fbbf24', sub: 'First Class threshold' },
                      { label: 'Forecast Status', value: forecast.status === 'guaranteed' ? 'Secured' : forecast.status === 'impossible' ? 'Impossible' : 'Conditional', color: forecast.status === 'guaranteed' ? '#10b981' : forecast.status === 'impossible' ? '#f87171' : '#6366f1', sub: forecast.status === 'guaranteed' ? 'First Class already secured' : forecast.status === 'impossible' ? 'Math is not enough' : 'Minimum A/A+ required' },
                    ].map((item) => (
                      <div key={item.label} style={{ background: '#0f1117', borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>{item.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: item.color, marginTop: 8 }}>{item.value}</div>
                        <div style={{ fontSize: 11, color: T.sub, marginTop: 6 }}>{item.sub}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Forecast Result" subtitle="Minimum A/A+ grades needed" />
                  <div style={{ padding: '20px 24px' }}>
                    {forecast.status === 'guaranteed' ? (
                      <div style={{ color: '#10b981', fontWeight: 700, marginBottom: 12 }}>First Class is already mathematically secured.</div>
                    ) : forecast.status === 'impossible' ? (
                      <div style={{ color: '#f87171', fontWeight: 700, marginBottom: 12 }}>First Class is no longer mathematically reachable with the remaining subjects.</div>
                    ) : (
                      <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 12 }}>You need at least {forecast.minimumHighGrades ?? '-'} A/A+ grades among your remaining subjects to reach a cumulative GPA of {formatNumber(forecast.targetGPA ?? targetGPA, 2)}.</div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 12 }}>
                      <div style={{ background: '#0f1117', borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Projected GPA</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#fbbf24', marginTop: 8 }}>{forecast.projectedGPA !== null ? formatNumber(forecast.projectedGPA, 3) : '-'}</div>
                      </div>
                      {forecast.status === 'impossible' ? (
                        <div style={{ background: '#0f1117', borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Max Achievable GPA</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: '#f87171', marginTop: 8 }}>{forecast.maxAchievableGPA !== null ? formatNumber(forecast.maxAchievableGPA, 3) : '-'}</div>
                        </div>
                      ) : null}
                    </div>

                    {forecast.examplePath && Object.keys(forecast.examplePath).length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Example grade combination</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                          {Object.entries(forecast.examplePath).map(([grade, count]) => (
                            <div key={grade} style={{ background: '#111827', borderRadius: 10, padding: 12, border: `1px solid ${T.border}` }}>
                              <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>{grade}</div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: '#c7d2fe', marginTop: 6 }}>{count}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {forecast.status === 'possible' && forecast.alternativeScenarios?.length > 0 && (
                  <Card>
                    <CardHeader title="Alternative Scenarios" subtitle="More A/A+ grades improve projected GPA" />
                    <div style={{ padding: '20px 24px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        {forecast.alternativeScenarios.map((scenario) => (
                          <div key={scenario.highGrades} style={{ background: '#0f1117', borderRadius: 12, padding: 16, border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>A/A+ grades</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#c7d2fe', marginTop: 6 }}>{scenario.highGrades}</div>
                            <div style={{ fontSize: 11, color: T.sub, marginTop: 8 }}>Projected GPA {scenario.projectedGPA !== null ? formatNumber(scenario.projectedGPA, 3) : '-'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* ══ BATCH ══ */}
            {activeTab === 'batch' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card>
                  <CardHeader title="Batch GPA Distribution" subtitle="Overall GPA across all students" />
                  <div style={{ padding: '16px 20px 8px' }}>
                    <BatchDistributionChart data={histogramData} currentGPA={overall.gpa ?? null} avgGPA={batchAverageGpa} />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Subject Performance" subtitle="You vs Batch Average">
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['bar', 'line'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSubjectChartType(type)}
                          style={{
                            background: subjectChartType === type ? '#6366f1' : '#1e2236',
                            color: subjectChartType === type ? '#eff6ff' : '#94a3b8',
                            border: '1px solid #2d3148',
                            borderRadius: 8,
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          {type === 'bar' ? 'Bar' : 'Line'}
                        </button>
                      ))}
                    </div>
                  </CardHeader>
                  <div style={{ padding: '16px 20px 8px' }}>
                    <SubjectComparisonChart data={subjectChartData} type={subjectChartType} />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Semester Comparison" subtitle="Your semester GPAs vs cohort averages" />
                  <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          {['Semester', 'Your GPA', 'Batch Avg', 'Difference'].map((h) => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: T.dim, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {semesterComparisonRows.map((row, idx) => (
                          <tr key={row.key} style={{ borderBottom: `1px solid ${T.border}22`, background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{row.label}</td>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{formatNumber(row.studentGpa)}</td>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: T.text }}>{formatNumber(row.batchAvg)}</td>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: row.diff >= 0 ? '#10b981' : '#f87171' }}>{row.diff !== null ? `${row.diff >= 0 ? '+' : ''}${formatNumber(row.diff, 2)}` : '-'}</td>
                          </tr>
                        ))}
                        {semesterComparisonRows.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ padding: '18px 14px', fontSize: 13, color: T.muted }}>Not enough semester data available to compare.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Batch Analytics" subtitle="Summary metrics" />
                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Average GPA', value: batchAverageGpa !== null ? formatNumber(batchAverageGpa) : 'Unavailable', color: '#fbbf24' },
                      { label: 'Median GPA',  value: batchMedianGpa !== null ? formatNumber(batchMedianGpa) : 'Unavailable', color: '#6366f1' },
                      { label: 'Pass Rate',   value: batchPassRate !== null ? formatPercent(batchPassRate, 1) : 'Unavailable', color: '#10b981' },
                      { label: 'Fail Rate',   value: batchFailRate !== null ? formatPercent(batchFailRate, 1) : 'Unavailable', color: '#f87171' },
                    ].map((m) => (
                      <div key={m.label} style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>{m.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 28, textAlign: 'center', fontSize: 11, color: '#2d3148' }}>
          BSc Financial Engineering · University of Colombo · Department of Mathematics · 2025 · Data from Google Sheets
        </div>
      </div>
    </div>
  );
}
