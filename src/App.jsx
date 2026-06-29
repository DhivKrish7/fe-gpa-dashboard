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

const T = { bg: '#0f1117', card: '#1a1d2e', border: '#2d3148', muted: '#64748b', dim: '#475569', text: '#e2e8f0', sub: '#94a3b8' };

const gradeColor = (grade) => GRADE_COLORS[grade] || '#475569';
const formatNumber = (value, digits = 3) => (value !== null && value !== undefined ? Number(value).toFixed(digits) : '-');
const formatPercent = (value, digits = 0) => (value !== null && value !== undefined ? `${Number(value).toFixed(digits)}%` : '-');

export default function App() {
  const [studentId, setStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [userGrades, setUserGrades] = useState({});
  const [targetGPA, setTargetGPA] = useState(3.75);
  const [activeTab, setActiveTab] = useState('results');
  const dropRef = useRef(null);

  const {
    batchStats,
    loading,
    error,
    schemaValid,
    missingColumns,
    lastSyncedAt,
    allIds,
    rankedStudents,
    selectedStudent,
    refreshData,
  } = useDashboardData(studentId, { targetGPA, overrides: userGrades });

  const filteredIds = useMemo(() => allIds.filter((id) => id.toLowerCase().includes(searchQuery.toLowerCase())), [allIds, searchQuery]);

  const stats = selectedStudent?.stats || null;
  const analytics = selectedStudent?.analytics || null;
  const overall = stats?.overall || {};
  const classification = stats?.degreeClassification || overall.classification || {};
  const forecast = stats?.forecast || {};
  const levelOneSemesters = (stats?.semesters || []).filter((semester) => semester.level === 'Level I');
  const semesterChartData = selectedStudent?.charts?.semesterTrend || [];
  const subjectChartData = selectedStudent?.charts?.subjectComparison || [];
  const histogramData = batchStats?.distribution || [];
  const neededPerCredit = forecast.neededPerCredit;

  const setGrade = (code, grade) => {
    setUserGrades((prev) => ({ ...prev, [code]: grade }));
  };

  const handleExport = () => {
    if (!selectedStudent) return;
    const html = buildReportHTML(selectedStudent, batchStats, targetGPA);
    const newWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      window.alert('Popup blocked. Please allow popups to export the report.');
      return;
    }
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.focus();
    setTimeout(() => newWindow.print(), 600);
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: T.bg, minHeight: '100vh', color: T.text }}>
      <DashboardHeader targetGPA={targetGPA} currentGPA={overall.gpa ?? null} onTargetChange={setTargetGPA} onExport={handleExport} canExport={Boolean(selectedStudent)} />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>{schemaValid ? 'Schema ready' : `Missing columns: ${missingColumns.join(', ')}`}</div>
          <button onClick={() => refreshData()} style={{ background: '#1e2236', border: '1px solid #2d3148', color: '#c7d2fe', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Refresh Data</button>
        </div>
        <StudentSelector searchQuery={searchQuery} onSearchChange={(value) => { setSearchQuery(value); setShowDropdown(true); }} onSelectStudent={(id) => { setStudentId(id); setSearchQuery(id); setShowDropdown(false); setUserGrades({}); }} onFocus={() => setShowDropdown(true)} filteredIds={filteredIds} loading={loading} error={error} selectedStudentId={studentId} allIds={allIds} showDropdown={showDropdown} onToggleDropdown={() => setShowDropdown((prev) => !prev)} dropRef={dropRef} />
        {lastSyncedAt ? <div style={{ fontSize: 11, color: '#475569', marginBottom: 18 }}>Last sync: {new Date(lastSyncedAt).toLocaleString()}</div> : null}

        {!studentId ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Select your Registration ID above to view your GPA dashboard</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>{allIds.length > 0 ? `${allIds.length} students loaded from batch database` : 'Loading batch data...'}</div>
          </div>
        ) : !selectedStudent ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{loading ? 'Loading student analytics...' : 'Student analytics unavailable'}</div>
          </div>
        ) : (
          <>
            <KpiGrid metrics={[
              { label: 'Overall GPA', value: formatNumber(overall.gpa), color: classification.color || '#475569', sub: classification.label || 'N/A' },
              { label: 'Batch Rank', value: stats.rank ? `${stats.rank} / ${stats.rankedStudentCount}` : '-', color: '#6366f1', sub: 'of graded students' },
              { label: 'Percentile', value: formatPercent(stats.percentile), color: '#10b981', sub: 'relative standing' },
              { label: 'Batch Avg GPA', value: formatNumber(batchStats?.averageGpa), color: '#f59e0b', sub: 'for comparison' },
              { label: 'Credits Earned', value: overall.credits ?? 0, color: '#60a5fa', sub: `of ${stats.gpaCreditTotal} GPA credits` },
              { label: 'Need Per Credit', value: neededPerCredit !== null && neededPerCredit !== undefined ? (neededPerCredit > 4 ? 'Impossible' : formatNumber(neededPerCredit, 2)) : '-', color: neededPerCredit > 4 ? '#f87171' : '#a3e635', sub: `to reach GPA ${forecast.targetGPA ?? targetGPA}` },
            ]} />

            <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: `1px solid ${T.border}` }}>
              {[['results', 'Grades & Results'], ['forecast', 'Forecast'], ['batch', 'Batch Analysis']].map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? '#6366f1' : 'transparent', border: 'none', borderRadius: '8px 8px 0 0', color: activeTab === tab ? '#fff' : T.muted, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
              ))}
            </div>

            {activeTab === 'results' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                  {levelOneSemesters.map((semester) => {
                    const c = semester.classification || {};
                    return <Card key={semester.key} style={{ padding: '16px 20px', borderTop: `3px solid ${c.color || T.border}` }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.1em' }}>{semester.label}</div><div style={{ fontSize: 32, fontWeight: 800, color: c.color || T.dim, margin: '6px 0 2px' }}>{formatNumber(semester.gpa)}</div><div style={{ fontSize: 12, color: c.color || T.dim }}>{c.label || 'N/A'}</div><div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>{semester.credits}C graded of {semester.totalCredits}C</div></Card>;
                  })}
                </div>

                <Card>
                  <CardHeader title="GPA Trend - Level I" subtitle="Actual performance vs your target" />
                  <div style={{ padding: '16px 20px 8px' }}><GPATrendChart data={semesterChartData} targetGPA={forecast.targetGPA ?? targetGPA} /></div>
                </Card>

                <Card>
                  <CardHeader title="Academic Insights" subtitle="Performance summary" />
                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Strongest Subject</div><div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{analytics?.strongestSubject?.code || '-'}</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Weakest Subject</div><div style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginTop: 4 }}>{analytics?.weakestSubject?.code || '-'}</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Consistency Score</div><div style={{ fontSize: 16, fontWeight: 700, color: '#6366f1', marginTop: 4 }}>{formatPercent(analytics?.consistencyScore)}</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Academic Health</div><div style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>{formatPercent(analytics?.academicHealth?.score)}</div></div>
                  </div>
                </Card>

                {levelOneSemesters.map((semester) => (
                  <Card key={semester.key}>
                    <CardHeader title={`${semester.label} - ${semester.courses[0]?.code || ''} to ${semester.courses.filter((course) => !course.nonGPA).at(-1)?.code || ''}${semester.editable ? ' (editable)' : ''}`} />
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{['Code', 'Course', 'Cr', 'Grade', 'Pts', 'Total'].map((header) => <th key={header} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: T.dim, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600 }}>{header}</th>)}</tr></thead>
                      <tbody>{semester.courses.map((course, index) => {
                        const absent = course.grade === '-';
                        const editable = course.editable && !course.nonGPA;
                        return <tr key={course.code} style={{ borderBottom: `1px solid ${T.border}22`, background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ padding: '9px 16px', fontSize: 12, color: T.muted, fontFamily: 'monospace' }}>{course.code}</td>
                          <td style={{ padding: '9px 16px', fontSize: 13, color: T.text }}>{course.name}</td>
                          <td style={{ padding: '9px 16px', fontSize: 12, color: T.sub }}>{course.credits}C</td>
                          <td style={{ padding: '9px 16px' }}>{editable ? <select value={course.grade || ''} onChange={(event) => setGrade(course.code, event.target.value)} style={{ background: course.grade && course.grade !== '-' ? `${gradeColor(course.grade)}22` : '#0f1117', border: `1px solid ${course.grade && course.grade !== '-' ? `${gradeColor(course.grade)}66` : T.border}`, borderRadius: 6, color: course.grade ? gradeColor(course.grade) : T.muted, padding: '4px 8px' }}><option value="">-</option><option value="-">ABS</option>{GRADE_SCALE.map((entry) => <option key={entry.label} value={entry.label}>{entry.label}</option>)}</select> : <span style={{ fontWeight: 700, color: absent ? '#ef4444' : course.points !== null ? gradeColor(course.grade) : T.dim }}>{absent ? 'ABS' : course.grade || '-'}</span>}</td>
                          <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 600, color: course.points !== null ? gradeColor(course.grade) : T.border }}>{course.points !== null ? formatNumber(course.points, 2) : '-'}</td>
                          <td style={{ padding: '9px 16px', fontSize: 13, color: course.totalPoints !== null ? T.text : T.border }}>{course.totalPoints !== null ? formatNumber(course.totalPoints, 2) : '-'}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'forecast' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Card>
                    <CardHeader title="Scenario Planner" subtitle={`Remaining ${forecast.remainingCredits ?? 0} GPA credits`} />
                    <div style={{ padding: '8px 0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{['If Avg', 'Points', 'Final GPA', 'Class', 'Hit Target?'].map((header) => <th key={header} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '.08em' }}>{header}</th>)}</tr></thead>
                        <tbody>{(forecast.scenarios || []).map((scenario) => <tr key={scenario.grade} style={{ borderBottom: `1px solid ${T.border}22`, background: scenario.hitsTarget ? 'rgba(16,185,129,0.06)' : 'transparent' }}><td style={{ padding: '8px 16px', fontWeight: 700, color: gradeColor(scenario.grade) }}>{scenario.grade}</td><td style={{ padding: '8px 16px', color: T.sub, fontSize: 12 }}>{formatNumber(scenario.points, 2)}</td><td style={{ padding: '8px 16px', fontWeight: 700, color: scenario.classification?.color || T.sub }}>{formatNumber(scenario.finalGPA)}</td><td style={{ padding: '8px 16px', fontSize: 12, color: scenario.classification?.color || T.sub }}>{scenario.classification?.label || 'N/A'}</td><td style={{ padding: '8px 16px', fontWeight: 700, color: scenario.hitsTarget ? '#10b981' : '#f87171' }}>{scenario.hitsTarget ? 'Yes' : 'No'}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </Card>
                  <Card>
                    <CardHeader title="Degree Progress" subtitle="Current completion vs degree target" />
                    <div style={{ padding: '20px 24px' }}>
                      {(stats.levelProgress || []).map((item, index) => <div key={item.label} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 12, color: T.sub }}>{item.label}</span><span style={{ fontSize: 12, color: T.muted }}>{item.earned}/{item.credits}C</span></div><div style={{ height: 8, background: T.border, borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${item.percent}%`, background: index === 0 ? '#6366f1' : '#475569', borderRadius: 4 }} /></div></div>)}
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: T.sub }}>Total ({stats.degreeCredits}C)</span><span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>{overall.credits || 0}/{stats.degreeCredits}C</span></div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'batch' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card>
                  <CardHeader title="Batch GPA Distribution" subtitle="Overall GPA" />
                  <div style={{ padding: '16px 20px 8px' }}><BatchDistributionChart data={histogramData} currentGPA={overall.gpa ?? null} avgGPA={batchStats?.averageGpa ?? null} /></div>
                </Card>
                <Card>
                  <CardHeader title="Subject Performance" subtitle="You vs Batch Average" />
                  <div style={{ padding: '16px 20px 8px' }}><SubjectComparisonChart data={subjectChartData} /></div>
                </Card>
                <Card>
                  <CardHeader title="Batch Analytics" subtitle="Summary metrics" />
                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Average GPA</div><div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>{formatNumber(batchStats?.averageGpa)}</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Median GPA</div><div style={{ fontSize: 20, fontWeight: 700, color: '#6366f1', marginTop: 4 }}>{formatNumber(batchStats?.medianGpa)}</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Pass Rate</div><div style={{ fontSize: 20, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{formatPercent(batchStats?.passRate, 1)}</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Fail Rate</div><div style={{ fontSize: 20, fontWeight: 700, color: '#f87171', marginTop: 4 }}>{formatPercent(batchStats?.failRate, 1)}</div></div>
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Top 10 Students" subtitle="Batch leaderboard" />
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{['Rank', 'Reg ID', 'Sem I GPA', 'Sem II GPA', 'Overall GPA', 'Class'].map((header) => <th key={header} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '.08em' }}>{header}</th>)}</tr></thead>
                    <tbody>{rankedStudents.slice(0, 10).map((student, index) => { const c = student.classification || {}; return <tr key={student.id} style={{ borderBottom: `1px solid ${T.border}22`, background: student.id === studentId ? '#312e8133' : 'transparent' }}><td style={{ padding: '8px 16px', fontWeight: 700, color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#f97316' : T.sub }}>{student.rank}</td><td style={{ padding: '8px 16px', fontFamily: 'monospace', fontSize: 13, color: student.id === studentId ? '#c7d2fe' : T.text, fontWeight: student.id === studentId ? 700 : 400 }}>{student.id}</td><td style={{ padding: '8px 16px', color: c.color || T.sub, fontWeight: 600 }}>{formatNumber(student.semesterGpas?.level1Semester1)}</td><td style={{ padding: '8px 16px', color: c.color || T.sub, fontWeight: 600 }}>{formatNumber(student.semesterGpas?.level1Semester2)}</td><td style={{ padding: '8px 16px', color: c.color || T.sub, fontWeight: 800 }}>{formatNumber(student.gpa)}</td><td style={{ padding: '8px 16px', fontSize: 12, color: c.color || T.sub }}>{c.label || 'N/A'}</td></tr>; })}</tbody>
                  </table>
                </Card>
              </div>
            )}
          </>
        )}
        <div style={{ marginTop: 28, textAlign: 'center', fontSize: 11, color: '#2d3148' }}>
          BSc Financial Engineering - University of Colombo - Department of Mathematics - 2025 Handbook - Data from Google Sheets
        </div>
      </div>
    </div>
  );
}
