import { useMemo, useRef, useState } from 'react';
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

export default function App() {
  const [studentId, setStudentId] = useState('');
  const [userGrades, setUserGrades]   = useState({});
  const [targetGPA, setTargetGPA]     = useState(3.7);   // default 3.7
  const [activeTab, setActiveTab]     = useState('results');

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
  const neededPerCredit   = forecast.neededPerCredit;

  const setGrade = (code, grade) =>
    setUserGrades((prev) => ({ ...prev, [code]: grade }));

  const handleSelectStudent = (id) => {
    setStudentId(id);
    setUserGrades({});
    setActiveTab('results');
  };

  const handleExport = () => {
    if (!selectedStudent) return;
    const html = buildReportHTML(selectedStudent, batchStats, targetGPA);
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
        targetGPA={targetGPA}
        currentGPA={overall.gpa ?? null}
        onTargetChange={setTargetGPA}
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
              { label: 'Batch Avg GPA',  value: formatNumber(batchStats?.averageGpa), color: '#f59e0b', sub: 'for comparison' },
              { label: 'Credits Earned', value: overall.credits ?? 0, color: '#60a5fa', sub: `of ${stats.gpaCreditTotal} GPA credits` },
              {
                label: 'Need Per Credit',
                value: neededPerCredit !== null && neededPerCredit !== undefined
                  ? (neededPerCredit > 4 ? 'Impossible' : formatNumber(neededPerCredit, 2))
                  : '-',
                color: neededPerCredit > 4 ? '#f87171' : '#a3e635',
                sub: `to reach GPA ${forecast.targetGPA ?? targetGPA}`,
              },
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Card>
                    <CardHeader title="Scenario Planner" subtitle={`Remaining ${forecast.remainingCredits ?? 0} GPA credits`} />
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                          {['If Avg', 'Points', 'Final GPA', 'Class', 'Hit Target?'].map((h) => (
                            <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '.08em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(forecast.scenarios || []).map((s) => (
                          <tr key={s.grade} style={{ borderBottom: `1px solid ${T.border}22`, background: s.hitsTarget ? 'rgba(16,185,129,0.06)' : 'transparent' }}>
                            <td style={{ padding: '8px 16px', fontWeight: 700, color: gradeColor(s.grade) }}>{s.grade}</td>
                            <td style={{ padding: '8px 16px', color: T.sub, fontSize: 12 }}>{formatNumber(s.points, 2)}</td>
                            <td style={{ padding: '8px 16px', fontWeight: 700, color: s.classification?.color || T.sub }}>{formatNumber(s.finalGPA)}</td>
                            <td style={{ padding: '8px 16px', fontSize: 12, color: s.classification?.color || T.sub }}>{s.classification?.label || 'N/A'}</td>
                            <td style={{ padding: '8px 16px', fontWeight: 700, color: s.hitsTarget ? '#10b981' : '#f87171' }}>{s.hitsTarget ? '✓ Yes' : '✗ No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>

                  <Card>
                    <CardHeader title="Degree Progress" subtitle="Current completion" />
                    <div style={{ padding: '20px 24px' }}>
                      {(stats.levelProgress || []).map((item, i) => (
                        <div key={item.label} style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: T.sub }}>{item.label}</span>
                            <span style={{ fontSize: 12, color: T.muted }}>{item.earned}/{item.credits}C</span>
                          </div>
                          <div style={{ height: 8, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${item.percent}%`, background: i === 0 ? '#6366f1' : '#475569', borderRadius: 4, transition: 'width 0.5s' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* ══ BATCH ══ */}
            {activeTab === 'batch' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card>
                  <CardHeader title="Batch GPA Distribution" subtitle="Overall GPA across all students" />
                  <div style={{ padding: '16px 20px 8px' }}>
                    <BatchDistributionChart data={histogramData} currentGPA={overall.gpa ?? null} avgGPA={batchStats?.averageGpa ?? null} />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Subject Performance" subtitle="You vs Batch Average" />
                  <div style={{ padding: '16px 20px 8px' }}>
                    <SubjectComparisonChart data={subjectChartData} />
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Batch Analytics" subtitle="Summary metrics" />
                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Average GPA', value: formatNumber(batchStats?.averageGpa), color: '#fbbf24' },
                      { label: 'Median GPA',  value: formatNumber(batchStats?.medianGpa),  color: '#6366f1' },
                      { label: 'Pass Rate',   value: formatPercent(batchStats?.passRate, 1), color: '#10b981' },
                      { label: 'Fail Rate',   value: formatPercent(batchStats?.failRate, 1), color: '#f87171' },
                    ].map((m) => (
                      <div key={m.label} style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>{m.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: m.color, marginTop: 4 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Top 10 Students" subtitle="Batch leaderboard" />
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                        {['Rank', 'Reg ID', 'Sem I GPA', 'Sem II GPA', 'Sem III GPA', 'Overall GPA', 'Class'].map((h) => (
                          <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '.08em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rankedStudents.slice(0, 10).map((s, i) => {
                        const c = s.classification || {};
                        return (
                          <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}22`, background: s.id === studentId ? '#312e8133' : 'transparent' }}>
                            <td style={{ padding: '8px 16px', fontWeight: 700, color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#f97316' : T.sub }}>{s.rank}</td>
                            <td style={{ padding: '8px 16px', fontFamily: 'monospace', fontSize: 13, color: s.id === studentId ? '#c7d2fe' : T.text, fontWeight: s.id === studentId ? 700 : 400 }}>
                              {s.id}{s.id === studentId && <span style={{ marginLeft: 8, fontSize: 10, color: '#6366f1' }}>← YOU</span>}
                            </td>
                            <td style={{ padding: '8px 16px', color: c.color || T.sub, fontWeight: 600 }}>{formatNumber(s.semesterGpas?.level1Semester1)}</td>
                            <td style={{ padding: '8px 16px', color: c.color || T.sub, fontWeight: 600 }}>{formatNumber(s.semesterGpas?.level1Semester2)}</td>
                            <td style={{ padding: '8px 16px', color: c.color || T.sub, fontWeight: 600 }}>{formatNumber(s.semesterGpas?.level1Semester3)}</td>
                            <td style={{ padding: '8px 16px', color: c.color || T.sub, fontWeight: 800 }}>{formatNumber(s.gpa)}</td>
                            <td style={{ padding: '8px 16px', fontSize: 12, color: c.color || T.sub }}>{c.label || 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
