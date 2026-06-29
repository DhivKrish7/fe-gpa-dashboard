import { useMemo, useRef, useState } from 'react';
import { DashboardHeader } from './components/layout/DashboardHeader';
import { StudentSelector } from './components/dashboard/StudentSelector';
import { KpiGrid } from './components/dashboard/KpiGrid';
import { Card, CardHeader } from './components/common/Card';
import { GPATrendChart } from './components/charts/GPATrendChart';
import { BatchDistributionChart } from './components/charts/BatchDistributionChart';
import { SubjectComparisonChart } from './components/charts/SubjectComparisonChart';
import { useDashboardData } from './hooks/useDashboardData';
import { computeGPA, getGPAClassification, calculateNeededGPA, gradeToPoints, getRankedStudents } from './utils/gpa';
import { buildReportHTML } from './utils/report';
import { L1_COURSES, L2_COURSES, L3_CORE, ALL_CODES } from './constants/courses';
import { GRADE_COLORS, GRADE_SCALE } from './constants/grades';

const T = { bg: '#0f1117', card: '#1a1d2e', border: '#2d3148', muted: '#64748b', dim: '#475569', text: '#e2e8f0', sub: '#94a3b8' };

const gradeColor = (g) => GRADE_COLORS[g] || '#475569';

const getSubjectChartData = (grades, rows) => {
  return L1_COURSES.map((course) => {
    const currentPoints = gradeToPoints(grades[course.code]);
    const batchPoints = rows.map((row) => gradeToPoints(row[course.code])).filter((value) => value !== null);
    const batchAvg = batchPoints.length ? batchPoints.reduce((a, b) => a + b, 0) / batchPoints.length : null;
    return {
      name: course.code.replace('FE ', ''),
      me: currentPoints,
      batch: batchAvg !== null ? Number(batchAvg.toFixed(2)) : null,
    };
  });
};

const getHistogramData = (batchStats, currentGPA) => {
  const buckets = {};
  const step = 0.25;
  for (let value = 0; value <= 4; value += step) {
    buckets[value.toFixed(2)] = 0;
  }
  batchStats.forEach((gpa) => {
    const bucket = (Math.floor(gpa / step) * step).toFixed(2);
    if (buckets[bucket] !== undefined) buckets[bucket] += 1;
  });
  return Object.entries(buckets).map(([gpa, count]) => ({ gpa: Number(gpa), count, isMe: currentGPA !== null && Math.abs(Number(gpa) - Math.floor(currentGPA / step) * step) < 0.001 }));
};

const getSemesterChartData = (stats, targetGPA) => [
  { name: 'Sem I', GPA: stats.s1.gpa, Target: targetGPA },
  { name: 'Sem II', GPA: stats.s2.gpa, Target: targetGPA },
  { name: 'Sem III', GPA: stats.s3.gpa, Target: targetGPA },
].filter((entry) => entry.GPA !== null);

export default function App() {
  const [studentId, setStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [userGrades, setUserGrades] = useState({});
  const [targetGPA, setTargetGPA] = useState(3.75);
  const [activeTab, setActiveTab] = useState('results');
  const dropRef = useRef(null);

  const { rows, loading, error, source, schemaValid, missingColumns, lastSyncedAt, allIds, rankedStudents, studentLookup, refreshData, courses } = useDashboardData();

  const filteredIds = useMemo(() => allIds.filter((id) => id.toLowerCase().includes(searchQuery.toLowerCase())), [allIds, searchQuery]);

  const selectedStudent = studentId ? studentLookup[studentId] : null;

  const sheetGrades = useMemo(() => {
    if (!selectedStudent) return {};
    const grades = {};
    ALL_CODES.forEach((code) => {
      grades[code] = selectedStudent[code] || '';
    });
    return grades;
  }, [selectedStudent]);

  const grades = useMemo(() => {
    const final = { ...sheetGrades };
    Object.entries(userGrades).forEach(([code, grade]) => {
      if (grade) final[code] = grade;
    });
    return final;
  }, [sheetGrades, userGrades]);

  const s1 = useMemo(() => computeGPA(grades, L1_COURSES.slice(0, 5)), [grades]);
  const s2 = useMemo(() => computeGPA(grades, L1_COURSES.slice(5, 10)), [grades]);
  const s3 = useMemo(() => computeGPA(grades, L1_COURSES.slice(10, 15)), [grades]);
  const l1 = useMemo(() => computeGPA(grades, L1_COURSES), [grades]);

  const batchStats = useMemo(() => {
    const gpas = rows
      .map((row) => computeGPA(Object.fromEntries(ALL_CODES.map((code) => [code, row[code] || ''])), L1_COURSES).gpa)
      .filter((gpa) => gpa !== null)
      .sort((a, b) => b - a);
    const avg = gpas.length ? gpas.reduce((a, b) => a + b, 0) / gpas.length : null;
    const median = gpas.length ? gpas[Math.floor(gpas.length / 2)] : null;
    const passRate = gpas.length ? (gpas.filter((gpa) => gpa >= 2.0).length / gpas.length) * 100 : 0;
    const failRate = gpas.length ? (gpas.filter((gpa) => gpa < 2.0).length / gpas.length) * 100 : 0;
    return { gpas, avg, median, passRate, failRate };
  }, [rows]);

  const ranked = useMemo(() => getRankedStudents(rows, L1_COURSES), [rows]);

  const cls = useMemo(() => getGPAClassification(l1.gpa), [l1.gpa]);
  const neededGPA = useMemo(() => calculateNeededGPA(l1.gpa, l1.credits, targetGPA), [l1.gpa, l1.credits, targetGPA]);

  const semesterChartData = useMemo(() => getSemesterChartData({ s1, s2, s3 }, targetGPA), [s1, s2, s3, targetGPA]);
  const subjectChartData = useMemo(() => getSubjectChartData(grades, rows), [grades, rows]);
  const histogramData = useMemo(() => getHistogramData(batchStats.gpas, l1.gpa), [batchStats.gpas, l1.gpa]);

  const analytics = useMemo(() => {
    const current = grades;
    const subjectScores = L1_COURSES.map((course) => {
      const myPoints = gradeToPoints(current[course.code]);
      const batchPoints = rows.map((row) => gradeToPoints(row[course.code])).filter((value) => value !== null);
      const batchAvg = batchPoints.length ? batchPoints.reduce((a, b) => a + b, 0) / batchPoints.length : null;
      const percentile = batchAvg !== null && myPoints !== null ? ((batchPoints.filter((value) => value < myPoints).length / batchPoints.length) * 100).toFixed(1) : '—';
      const difficulty = batchAvg !== null && myPoints !== null ? Number((batchAvg - myPoints).toFixed(2)) : 0;
      return { ...course, myPoints, batchAvg, percentile, difficulty, isStrongest: myPoints !== null && batchAvg !== null && myPoints >= batchAvg, isWeakest: myPoints !== null && batchAvg !== null && myPoints <= batchAvg };
    });
    const strong = subjectScores.filter((item) => item.myPoints !== null && item.batchAvg !== null).sort((a, b) => (b.myPoints || 0) - (a.myPoints || 0))[0];
    const weak = subjectScores.filter((item) => item.myPoints !== null && item.batchAvg !== null).sort((a, b) => (a.myPoints || 0) - (b.myPoints || 0))[0];
    const consistency = subjectScores.filter((item) => item.myPoints !== null).length ? (subjectScores.filter((item) => item.myPoints !== null && item.myPoints >= 3.0).length / subjectScores.filter((item) => item.myPoints !== null).length) * 100 : 0;
    const health = l1.gpa !== null ? Math.min(100, Math.max(0, l1.gpa / 4 * 100)) : 0;
    return { strong, weak, consistency, health, subjectScores };
  }, [grades, l1.gpa, rows]);

  const setGrade = (code, grade) => {
    setUserGrades((prev) => ({ ...prev, [code]: grade }));
  };

  const handleExport = () => {
    if (!studentId) return;
    const html = buildReportHTML(studentId, grades, rows, targetGPA);
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
      <DashboardHeader targetGPA={targetGPA} currentGPA={l1.gpa} onTargetChange={setTargetGPA} onExport={handleExport} canExport={Boolean(studentId)} />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>{schemaValid ? 'Schema ready' : `Missing columns: ${missingColumns.join(', ')}`}</div>
          <button onClick={() => refreshData()} style={{ background: '#1e2236', border: '1px solid #2d3148', color: '#c7d2fe', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>↻ Refresh Data</button>
        </div>
        <StudentSelector searchQuery={searchQuery} onSearchChange={(value) => { setSearchQuery(value); setShowDropdown(true); }} onSelectStudent={(id) => { setStudentId(id); setSearchQuery(id); setShowDropdown(false); setUserGrades({}); }} onFocus={() => setShowDropdown(true)} filteredIds={filteredIds} loading={loading} error={error} selectedStudentId={studentId} allIds={allIds} showDropdown={showDropdown} onToggleDropdown={() => setShowDropdown((prev) => !prev)} dropRef={dropRef} />
        {lastSyncedAt ? <div style={{ fontSize: 11, color: '#475569', marginBottom: 18 }}>Last sync: {new Date(lastSyncedAt).toLocaleString()}</div> : null}

        {!studentId ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: T.muted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Select your Registration ID above to view your GPA dashboard</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>{allIds.length > 0 ? `${allIds.length} students loaded from batch database` : 'Loading batch data…'}</div>
          </div>
        ) : (
          <>
            <KpiGrid metrics={[
              { label: 'Level I GPA', value: l1.gpa !== null ? l1.gpa.toFixed(3) : '—', color: cls.color, sub: cls.label },
              { label: 'Batch Rank', value: ranked.find((student) => student.id === studentId)?.rank ? `${ranked.find((student) => student.id === studentId)?.rank} / ${ranked.length}` : '—', color: '#6366f1', sub: 'of graded students' },
              { label: 'Percentile', value: ranked.find((student) => student.id === studentId)?.rank ? `${Math.round(((ranked.length - (ranked.find((student) => student.id === studentId)?.rank - 1)) / ranked.length) * 100)}%` : '—', color: '#10b981', sub: 'above peers' },
              { label: 'Batch Avg GPA', value: batchStats.avg !== null ? batchStats.avg.toFixed(3) : '—', color: '#f59e0b', sub: 'for comparison' },
              { label: 'Credits Earned', value: l1.credits, color: '#60a5fa', sub: 'of 88 GPA credits' },
              { label: 'Need Per Credit', value: neededGPA !== null ? (neededGPA > 4 ? 'Impossible' : neededGPA.toFixed(2)) : '—', color: neededGPA > 4 ? '#f87171' : '#a3e635', sub: `to reach GPA ${targetGPA}` },
            ]} />

            <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: `1px solid ${T.border}` }}>
              {[['results', '📋 Grades & Results'], ['forecast', '📈 Forecast'], ['batch', '👥 Batch Analysis']].map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? '#6366f1' : 'transparent', border: 'none', borderRadius: '8px 8px 0 0', color: activeTab === tab ? '#fff' : T.muted, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
              ))}
            </div>

            {activeTab === 'results' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {[{ name: 'Semester I', stat: s1, courses: L1_COURSES.slice(0, 5) }, { name: 'Semester II', stat: s2, courses: L1_COURSES.slice(5, 10) }, { name: 'Semester III ✏', stat: s3, courses: L1_COURSES.slice(10, 15) }].map(({ name, stat, courses }) => {
                    const c = getGPAClassification(stat.gpa);
                    return <Card key={name} style={{ padding: '16px 20px', borderTop: `3px solid ${c.color}` }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '.1em' }}>{name}</div><div style={{ fontSize: 32, fontWeight: 800, color: c.color, margin: '6px 0 2px' }}>{stat.gpa !== null ? stat.gpa.toFixed(3) : '—'}</div><div style={{ fontSize: 12, color: c.color }}>{c.label}</div><div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>{stat.credits}C graded of {courses.reduce((sum, course) => sum + course.credits, 0)}C</div></Card>;
                  })}
                </div>

                <Card>
                  <CardHeader title="GPA Trend — Level I" subtitle="Actual performance vs your target" />
                  <div style={{ padding: '16px 20px 8px' }}><GPATrendChart data={semesterChartData} targetGPA={targetGPA} /></div>
                </Card>

                <Card>
                  <CardHeader title="Academic Insights" subtitle="Performance summary" />
                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Strongest Subject</div><div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{analytics.strong?.code || '—'}</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Weakest Subject</div><div style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginTop: 4 }}>{analytics.weak?.code || '—'}</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Consistency Score</div><div style={{ fontSize: 16, fontWeight: 700, color: '#6366f1', marginTop: 4 }}>{analytics.consistency.toFixed(0)}%</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Academic Health</div><div style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>{analytics.health.toFixed(0)}%</div></div>
                  </div>
                </Card>

                {[{ label: 'Semester I — FE 1021 to FE 1025', courses: L1_COURSES.slice(0, 5), locked: true }, { label: 'Semester II — FE 1026 to FE 1030', courses: L1_COURSES.slice(5, 10), locked: true }, { label: 'Semester III — FE 1031 to FE 1035 (editable)', courses: L1_COURSES.slice(10, 15), locked: false }].map(({ label, courses, locked }) => (
                  <Card key={label}>
                    <CardHeader title={label} />
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{['Code', 'Course', 'Cr', 'Grade', 'Pts', 'Total'].map((header) => <th key={header} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: T.dim, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600 }}>{header}</th>)}</tr></thead>
                      <tbody>{courses.map((course, index) => {
                        const grade = grades[course.code];
                        const points = gradeToPoints(grade);
                        const absent = grade === '-';
                        return <tr key={course.code} style={{ borderBottom: `1px solid ${T.border}22`, background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ padding: '9px 16px', fontSize: 12, color: T.muted, fontFamily: 'monospace' }}>{course.code}</td>
                          <td style={{ padding: '9px 16px', fontSize: 13, color: T.text }}>{course.name}</td>
                          <td style={{ padding: '9px 16px', fontSize: 12, color: T.sub }}>{course.credits}C</td>
                          <td style={{ padding: '9px 16px' }}>{locked ? <span style={{ fontWeight: 700, color: absent ? '#ef4444' : points !== null ? gradeColor(grade) : T.dim }}>{absent ? 'ABS' : grade || '—'}</span> : <select value={grade || ''} onChange={(event) => setGrade(course.code, event.target.value)} style={{ background: grade && grade !== '-' ? `${gradeColor(grade)}22` : '#0f1117', border: `1px solid ${grade && grade !== '-' ? `${gradeColor(grade)}66` : T.border}`, borderRadius: 6, color: grade ? gradeColor(grade) : T.muted, padding: '4px 8px' }}><option value="">—</option><option value="-">ABS</option>{GRADE_SCALE.map((entry) => <option key={entry.label} value={entry.label}>{entry.label}</option>)}</select>}</td>
                          <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 600, color: points !== null ? gradeColor(grade) : T.border }}>{points !== null ? points.toFixed(2) : '—'}</td>
                          <td style={{ padding: '9px 16px', fontSize: 13, color: points !== null ? T.text : T.border }}>{points !== null ? (points * course.credits).toFixed(2) : '—'}</td>
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
                    <CardHeader title="Scenario Planner" subtitle={`Remaining ${88 - l1.credits} GPA credits`} />
                    <div style={{ padding: '8px 0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{['If Avg', 'Points', 'Final GPA', 'Class', 'Hit Target?'].map((header) => <th key={header} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '.08em' }}>{header}</th>)}</tr></thead>
                        <tbody>{GRADE_SCALE.filter((entry) => entry.label !== 'E').map((entry) => { const projGPA = (l1.gpa || 0) * l1.credits / 88 + entry.points * (88 - l1.credits) / 88; const c = getGPAClassification(projGPA); const hits = projGPA >= targetGPA; return <tr key={entry.label} style={{ borderBottom: `1px solid ${T.border}22`, background: hits ? 'rgba(16,185,129,0.06)' : 'transparent' }}><td style={{ padding: '8px 16px', fontWeight: 700, color: gradeColor(entry.label) }}>{entry.label}</td><td style={{ padding: '8px 16px', color: T.sub, fontSize: 12 }}>{entry.points.toFixed(2)}</td><td style={{ padding: '8px 16px', fontWeight: 700, color: c.color }}>{projGPA.toFixed(3)}</td><td style={{ padding: '8px 16px', fontSize: 12, color: c.color }}>{c.label}</td><td style={{ padding: '8px 16px', fontWeight: 700, color: hits ? '#10b981' : '#f87171' }}>{hits ? '✓' : '✗'}</td></tr>; })}</tbody>
                      </table>
                    </div>
                  </Card>
                  <Card>
                    <CardHeader title="Degree Progress" subtitle="Current completion vs degree target" />
                    <div style={{ padding: '20px 24px' }}>
                      {[{ label: 'Level I', credits: 30, earned: l1.credits, color: '#6366f1' }, { label: 'Level II', credits: 30, earned: 0, color: '#475569' }, { label: 'Level III', credits: 30, earned: 0, color: '#475569' }].map((item) => <div key={item.label} style={{ marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 12, color: T.sub }}>{item.label}</span><span style={{ fontSize: 12, color: T.muted }}>{item.earned}/{item.credits}C</span></div><div style={{ height: 8, background: T.border, borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${Math.min(100, (item.earned / item.credits) * 100)}%`, background: item.color, borderRadius: 4 }} /></div></div>)}
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: T.sub }}>Total (90C)</span><span style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>{l1.credits}/90C ({((l1.credits / 90) * 100).toFixed(0)}%)</span></div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'batch' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card>
                  <CardHeader title="Batch GPA Distribution" subtitle="Level I (Sem I + II)" />
                  <div style={{ padding: '16px 20px 8px' }}><BatchDistributionChart data={histogramData} currentGPA={l1.gpa} avgGPA={batchStats.avg} /></div>
                </Card>
                <Card>
                  <CardHeader title="Subject Performance" subtitle="You vs Batch Average" />
                  <div style={{ padding: '16px 20px 8px' }}><SubjectComparisonChart data={subjectChartData} /></div>
                </Card>
                <Card>
                  <CardHeader title="Batch Analytics" subtitle="Summary metrics" />
                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Average GPA</div><div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24', marginTop: 4 }}>{batchStats.avg !== null ? batchStats.avg.toFixed(3) : '—'}</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Median GPA</div><div style={{ fontSize: 20, fontWeight: 700, color: '#6366f1', marginTop: 4 }}>{batchStats.median !== null ? batchStats.median.toFixed(3) : '—'}</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Pass Rate</div><div style={{ fontSize: 20, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{batchStats.passRate.toFixed(1)}%</div></div>
                    <div style={{ background: '#0f1117', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>Fail Rate</div><div style={{ fontSize: 20, fontWeight: 700, color: '#f87171', marginTop: 4 }}>{batchStats.failRate.toFixed(1)}%</div></div>
                  </div>
                </Card>
                <Card>
                  <CardHeader title="Top 10 Students" subtitle="Batch leaderboard" />
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{['Rank', 'Reg ID', 'Sem I GPA', 'Sem II GPA', 'Avg GPA', 'Class'].map((header) => <th key={header} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '.08em' }}>{header}</th>)}</tr></thead>
                    <tbody>{ranked.slice(0, 10).map((student, index) => { const c = getGPAClassification(student.gpa); return <tr key={student.id} style={{ borderBottom: `1px solid ${T.border}22`, background: student.id === studentId ? '#312e8133' : 'transparent' }}><td style={{ padding: '8px 16px', fontWeight: 700, color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#f97316' : T.sub }}>{student.rank}</td><td style={{ padding: '8px 16px', fontFamily: 'monospace', fontSize: 13, color: student.id === studentId ? '#c7d2fe' : T.text, fontWeight: student.id === studentId ? 700 : 400 }}>{student.id}</td><td style={{ padding: '8px 16px', color: getGPAClassification(student.gpa).color, fontWeight: 600 }}>{student.gpa !== null ? student.gpa.toFixed(3) : '—'}</td><td style={{ padding: '8px 16px', color: getGPAClassification(student.gpa).color, fontWeight: 600 }}>{student.gpa !== null ? student.gpa.toFixed(3) : '—'}</td><td style={{ padding: '8px 16px', color: c.color, fontWeight: 800 }}>{student.gpa.toFixed(3)}</td><td style={{ padding: '8px 16px', fontSize: 12, color: c.color }}>{c.label}</td></tr>; })}</tbody>
                  </table>
                </Card>
              </div>
            )}
          </>
        )}
        <div style={{ marginTop: 28, textAlign: 'center', fontSize: 11, color: '#2d3148' }}>
          BSc Financial Engineering · University of Colombo · Department of Mathematics · 2025 Handbook · Data from Google Sheets
        </div>
      </div>
    </div>
  );
}
