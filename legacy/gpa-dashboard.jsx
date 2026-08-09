import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, Legend
} from "recharts";

// ── Grade Scale ───────────────────────────────────────────────────────────────
const GRADE_SCALE = [
  { label: "A+", min: 85, points: 4.00 },
  { label: "A",  min: 70, points: 4.00 },
  { label: "A-", min: 65, points: 3.70 },
  { label: "B+", min: 60, points: 3.30 },
  { label: "B",  min: 55, points: 3.00 },
  { label: "B-", min: 50, points: 2.70 },
  { label: "C+", min: 45, points: 2.30 },
  { label: "C",  min: 40, points: 2.00 },
  { label: "C-", min: 35, points: 1.70 },
  { label: "D+", min: 30, points: 1.30 },
  { label: "D",  min: 25, points: 1.00 },
  { label: "E",  min: 0,  points: 0.00 },
];
const gradeToPoints = (g) => {
  if (!g || g === "-" || g === "") return null;
  return GRADE_SCALE.find(x => x.label === g)?.points ?? null;
};

// ── Course catalogue (hard-coded from handbook) ───────────────────────────────
const SEM1_COURSES = [
  { code: "FE 1021", name: "Python Programming",                        credits: 2 },
  { code: "FE 1022", name: "Economics I for Finance",                   credits: 2 },
  { code: "FE 1023", name: "Financial Statement Analysis & Reporting I",credits: 2 },
  { code: "FE 1024", name: "Spreadsheet Analysis",                      credits: 2 },
  { code: "FE 1025", name: "Financial Mathematics I",                   credits: 2 },
];
const SEM2_COURSES = [
  { code: "FE 1026", name: "Applied Calculus I",                        credits: 2 },
  { code: "FE 1027", name: "Economics II for Finance",                  credits: 2 },
  { code: "FE 1028", name: "Scientific Computing with Python",          credits: 2 },
  { code: "FE 1029", name: "Data Visualization with Python",            credits: 2 },
  { code: "FE 1030", name: "Professional English for Finance",          credits: 2 },
];
const SEM3_COURSES = [
  { code: "FE 1031", name: "Linear Programming",                        credits: 2 },
  { code: "FE 1032", name: "Introduction to Probability Theory",        credits: 2 },
  { code: "FE 1033", name: "Financial Analytics I",                     credits: 2 },
  { code: "FE 1034", name: "Computational Linear Algebra",              credits: 2 },
  { code: "FE 1035", name: "Financial Mathematics II",                  credits: 2 },
];
const L1_COURSES = [...SEM1_COURSES, ...SEM2_COURSES, ...SEM3_COURSES];
const ALL_CODES  = L1_COURSES.map(c => c.code);

// ── Level II & III for forecast planner ──────────────────────────────────────
const L2_COURSES = [
  { code:"FE 2021",name:"Probability Distributions",credits:2},
  { code:"FE 2022",name:"Financial Analytics II",credits:2},
  { code:"FE 2023",name:"Quantitative Economics I",credits:2},
  { code:"FE 2024",name:"Applied Calculus II",credits:2},
  { code:"FE 2025",name:"Financial Markets & Instruments",credits:2},
  { code:"FE 2026",name:"Financial Analytics III",credits:2},
  { code:"FE 2027",name:"Supply Chain Models",credits:2},
  { code:"FE 2028",name:"Quantitative Economics II",credits:2},
  { code:"FE 2029",name:"Financial Economics",credits:2},
  { code:"FE 2030",name:"Insurance for Financial Services",credits:2},
  { code:"FE 2031",name:"Machine Learning in Financial Engineering",credits:2},
  { code:"FE 2032",name:"Financial Statements Analysis & Reporting II",credits:2},
  { code:"FE 2033",name:"Financial Economics & Analysis",credits:2},
  { code:"FE 2034",name:"Quantitative Financial Risk Analysis I",credits:2},
  { code:"FE 2035",name:"Survival Analysis",credits:2},
];
const L3_CORE = [
  { code:"FE 3021",name:"Investment Analysis",credits:2},
  { code:"FE 3022",name:"AI in Financial Engineering",credits:2},
  { code:"FE 3023",name:"Portfolio Optimization I",credits:2},
  { code:"FE 3024",name:"Quantitative Financial Risk Analysis II",credits:2},
  { code:"FE 3025",name:"Life Insurance Models & Risk Analysis",credits:2},
  { code:"FE 3026",name:"Portfolio Optimization II",credits:2},
  { code:"FE 3027",name:"Financial Simulation Models",credits:2},
  { code:"FE 3028",name:"Quantitative Economics III",credits:2},
  { code:"FE 3029",name:"Banking & International Finance",credits:2},
  { code:"FE 3030",name:"Case Studies in Financial Analytics",credits:3},
  { code:"FE 3031",name:"Professional Practice in Financial Analytics",credits:3},
  { code:"FE 3032",name:"Financial Analytics Project",credits:6},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const gpaClass = (gpa) => {
  if (gpa === null || isNaN(gpa)) return { label: "N/A", color: "#475569", bg: "#1e2236" };
  if (gpa >= 3.70) return { label: "First Class",        color: "#10b981", bg: "#064e3b22" };
  if (gpa >= 3.30) return { label: "Second Upper",       color: "#6366f1", bg: "#312e8122" };
  if (gpa >= 3.00) return { label: "Second Lower",       color: "#f59e0b", bg: "#78350f22" };
  if (gpa >= 2.00) return { label: "Pass",               color: "#94a3b8", bg: "#1e2940" };
  return               { label: "Below Pass",            color: "#f87171", bg: "#450a0a22" };
};

const gradeColor = (g) => ({
  "A+":"#10b981","A":"#10b981","A-":"#34d399",
  "B+":"#60a5fa","B":"#60a5fa","B-":"#93c5fd",
  "C+":"#fbbf24","C":"#fbbf24","C-":"#fcd34d",
  "D+":"#f87171","D":"#f87171","E":"#ef4444",
  "-":"#334155",
}[g] || "#475569");

const computeGPA = (grades, courses) => {
  let pts = 0, cr = 0;
  for (const c of courses) {
    const p = gradeToPoints(grades[c.code]);
    if (p !== null) { pts += p * c.credits; cr += c.credits; }
  }
  return cr > 0 ? { gpa: pts / cr, credits: cr } : { gpa: null, credits: 0 };
};

// ── Google Sheet CSV fetch ────────────────────────────────────────────────────
const SHEET_ID = "10xqeue5r3q3XkGrLYgXpZEPxAwxGRwDe87Pndnz3Mvs";
const SHEET_GID = "0"; // first tab
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  }).filter(r => r[headers[0]]);
}

// ── PDF generator (pure JS, no libs needed) ───────────────────────────────────
// We'll build a clean HTML report and use window.print()
function buildReportHTML(student, grades, batchData, targetGPA) {
  const s1 = computeGPA(grades, SEM1_COURSES);
  const s2 = computeGPA(grades, SEM2_COURSES);
  const s3 = computeGPA(grades, SEM3_COURSES);
  const l1 = computeGPA(grades, L1_COURSES);
  const cls = gpaClass(l1.gpa);

  // batch stats
  const batchGPAs = batchData
    .map(r => computeGPA(Object.fromEntries(ALL_CODES.map(c => [c, r[c]])), L1_COURSES).gpa)
    .filter(g => g !== null).sort((a,b) => b - a);
  const rank = batchGPAs.findIndex(g => g <= (l1.gpa || 0)) + 1 || batchGPAs.length + 1;
  const percentile = l1.gpa !== null
    ? ((batchGPAs.filter(g => g < l1.gpa).length / batchGPAs.length) * 100).toFixed(1)
    : "—";
  const batchAvg = batchGPAs.length ? (batchGPAs.reduce((a,b)=>a+b,0)/batchGPAs.length).toFixed(3) : "—";

  const gradeRow = (c) => {
    const g = grades[c.code];
    const p = gradeToPoints(g);
    const absent = g === "-";
    const pending = !g || g === "";
    return `
      <tr>
        <td style="font-family:monospace;font-size:11px;color:#666">${c.code}</td>
        <td style="font-size:12px">${c.name}</td>
        <td style="text-align:center;font-size:12px">${c.credits}C</td>
        <td style="text-align:center;font-weight:700;color:${absent?"#ef4444":pending?"#999":gradeColor(g)}">${absent?"ABS":pending?"—":g}</td>
        <td style="text-align:center;font-size:12px;color:#555">${p!==null?p.toFixed(2):"—"}</td>
        <td style="text-align:center;font-size:12px">${p!==null?(p*c.credits).toFixed(2):"—"}</td>
      </tr>`;
  };

  const forecastRows = GRADE_SCALE.filter(g => g.label !== "E").map(gs => {
    const rem = 88 - l1.credits;
    if (rem <= 0) return "";
    const proj = (l1.gpa || 0)*l1.credits/88 + gs.points*rem/88;
    const projFull = proj;
    const pCls = gpaClass(projFull);
    const hits = projFull >= targetGPA;
    return `<tr style="background:${hits?"#f0fff4":"#fff"}">
      <td style="text-align:center;font-weight:700;color:${gradeColor(gs.label)}">${gs.label}</td>
      <td style="text-align:center">${gs.points.toFixed(2)}</td>
      <td style="text-align:center;font-weight:700;color:${pCls.color}">${projFull.toFixed(3)}</td>
      <td style="text-align:center;color:${pCls.color}">${pCls.label}</td>
      <td style="text-align:center;font-weight:700;color:${hits?"#10b981":"#ef4444"}">${hits?"✓ Yes":"✗ No"}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>GPA Report – ${student}</title>
<style>
  @page { size: A4; margin: 18mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; font-size: 13px; background: white; }
  .header { background: linear-gradient(135deg,#1e1b4b,#312e81); color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 20px; }
  .header h1 { margin:0 0 4px; font-size:18px; }
  .header p  { margin:0; opacity:.75; font-size:12px; }
  .kpi-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:18px; }
  .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; }
  .kpi .label { font-size:10px; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
  .kpi .val   { font-size:22px; font-weight:800; }
  .kpi .sub   { font-size:10px; color:#94a3b8; margin-top:2px; }
  h2 { font-size:14px; font-weight:700; color:#1e1b4b; border-bottom:2px solid #6366f1; padding-bottom:4px; margin: 18px 0 10px; }
  table { width:100%; border-collapse:collapse; font-size:12px; margin-bottom:12px; }
  th { background:#1e1b4b; color:white; padding:7px 10px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.06em; }
  td { padding:6px 10px; border-bottom:1px solid #f1f5f9; }
  tr:nth-child(even) td { background:#f8fafc; }
  .sem-header { background:#e0e7ff; color:#3730a3; font-weight:700; font-size:11px; padding:5px 10px; }
  .sem-total  { background:#ede9fe; font-weight:700; }
  .badge { display:inline-block; padding:2px 8px; border-radius:12px; font-size:10px; font-weight:700; }
  .footer { margin-top:24px; text-align:center; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="header">
  <h1>BSc in Financial Engineering — GPA Report</h1>
  <p>Department of Mathematics · Faculty of Science · University of Colombo · Level I (2025)</p>
  <p style="margin-top:8px;font-size:14px;font-weight:700">Student ID: ${student}</p>
</div>

<div class="kpi-row">
  <div class="kpi">
    <div class="label">Level I GPA</div>
    <div class="val" style="color:${cls.color}">${l1.gpa!==null?l1.gpa.toFixed(3):"—"}</div>
    <div class="sub">${cls.label}</div>
  </div>
  <div class="kpi">
    <div class="label">Batch Rank</div>
    <div class="val" style="color:#6366f1">${l1.gpa!==null?rank+" / "+batchGPAs.length:"—"}</div>
    <div class="sub">of graded students</div>
  </div>
  <div class="kpi">
    <div class="label">Percentile</div>
    <div class="val" style="color:#10b981">${percentile}%</div>
    <div class="sub">above batch peers</div>
  </div>
  <div class="kpi">
    <div class="label">Batch Avg GPA</div>
    <div class="val" style="color:#f59e0b">${batchAvg}</div>
    <div class="sub">target: ${targetGPA}</div>
  </div>
</div>

<h2>Semester Performance Summary</h2>
<table>
  <tr><th>Semester</th><th>Credits Graded</th><th>GPA</th><th>Classification</th></tr>
  <tr><td>Semester I  (FE 1021–1025)</td><td>${s1.credits}C</td><td style="font-weight:700;color:${gpaClass(s1.gpa).color}">${s1.gpa!==null?s1.gpa.toFixed(3):"—"}</td><td>${gpaClass(s1.gpa).label}</td></tr>
  <tr><td>Semester II (FE 1026–1030)</td><td>${s2.credits}C</td><td style="font-weight:700;color:${gpaClass(s2.gpa).color}">${s2.gpa!==null?s2.gpa.toFixed(3):"—"}</td><td>${gpaClass(s2.gpa).label}</td></tr>
  <tr><td>Semester III (FE 1031–1035)</td><td>${s3.credits}C</td><td style="font-weight:700;color:${gpaClass(s3.gpa).color}">${s3.gpa!==null?s3.gpa.toFixed(3):"—"}</td><td>${gpaClass(s3.gpa).label}</td></tr>
  <tr style="background:#e0e7ff"><td style="font-weight:700">Level I Total</td><td style="font-weight:700">${l1.credits}C</td><td style="font-weight:800;color:${cls.color}">${l1.gpa!==null?l1.gpa.toFixed(3):"—"}</td><td style="font-weight:700;color:${cls.color}">${cls.label}</td></tr>
</table>

<h2>Subject-by-Subject Results — Level I</h2>
<table>
  <tr class="sem-header"><td colspan="6">Semester I</td></tr>
  <tr><th>Code</th><th>Course</th><th>Cr</th><th>Grade</th><th>Points</th><th>Total</th></tr>
  ${SEM1_COURSES.map(gradeRow).join("")}
  <tr class="sem-header"><td colspan="6">Semester II</td></tr>
  ${SEM2_COURSES.map(gradeRow).join("")}
  <tr class="sem-header"><td colspan="6">Semester III</td></tr>
  ${SEM3_COURSES.map(gradeRow).join("")}
</table>

<h2>GPA Forecast — Plan Ahead (Remaining ${88-l1.credits} credits)</h2>
<table>
  <tr><th>If Avg Grade Remaining</th><th>Points/Cr</th><th>Projected Final GPA</th><th>Classification</th><th>Hits Target (${targetGPA})?</th></tr>
  ${forecastRows}
</table>

<h2>Degree Classification Scale (University of Colombo)</h2>
<table>
  <tr><th>Classification</th><th>GPA Range</th><th>Your Status</th></tr>
  ${[
    {label:"First Class Honours",range:"≥ 3.70",color:"#10b981"},
    {label:"Second Class (Upper)",range:"3.30 – 3.69",color:"#6366f1"},
    {label:"Second Class (Lower)",range:"3.00 – 3.29",color:"#f59e0b"},
    {label:"Pass",range:"2.00 – 2.99",color:"#94a3b8"},
    {label:"Below Pass / Fail",range:"< 2.00",color:"#ef4444"},
  ].map(c=>`<tr>
    <td style="color:${c.color};font-weight:700">${c.label}</td>
    <td>${c.range}</td>
    <td>${l1.gpa!==null && gpaClass(l1.gpa).label===c.label?'<span style="color:'+c.color+';font-weight:700">◀ Current</span>':"—"}</td>
  </tr>`).join("")}
</table>

<div class="footer">
  Generated by BSc FE GPA Dashboard · University of Colombo · Batch 2025 · ${new Date().toLocaleDateString("en-GB",{year:"numeric",month:"long",day:"numeric"})}
</div>
</body>
</html>`;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [sheetData, setSheetData]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [studentId, setStudentId]   = useState("");
  const [searchQ, setSearchQ]       = useState("");
  const [showDrop, setShowDrop]     = useState(false);
  const [userGrades, setUserGrades] = useState({});
  const [targetGPA, setTargetGPA]   = useState(3.75);
  const [activeTab, setActiveTab]   = useState("results");
  const dropRef = useRef(null);

  // fetch CSV from GSheet
  useEffect(() => {
    fetch(CSV_URL)
      .then(r => { if (!r.ok) throw new Error("Sheet not accessible"); return r.text(); })
      .then(text => { setSheetData(parseCSV(text)); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // build list of IDs
  const allIds = useMemo(() => sheetData.map(r => r["Reg. No"] || r["Reg ID"] || "").filter(Boolean).sort(), [sheetData]);

  // filtered dropdown
  const filteredIds = useMemo(() =>
    allIds.filter(id => id.toLowerCase().includes(searchQ.toLowerCase())), [allIds, searchQ]);

  // close dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // get grades from sheet for selected student, merged with manual overrides
  const sheetGrades = useMemo(() => {
    if (!studentId) return {};
    const row = sheetData.find(r => (r["Reg. No"] || r["Reg ID"]) === studentId);
    if (!row) return {};
    const g = {};
    ALL_CODES.forEach(c => { g[c] = row[c] || ""; });
    return g;
  }, [studentId, sheetData]);

  // effective grades = sheet (locked for FE1021–FE1030) + user overrides for FE1031–FE1035 + L2/L3
  const grades = useMemo(() => {
    const locked = { ...sheetGrades };
    const editable = { ...userGrades };
    // merge: locked codes from sem1+sem2 are from sheet only, sem3+ allow user edit if empty
    const final = { ...editable };
    ALL_CODES.forEach(c => {
      const isLocked = SEM1_COURSES.concat(SEM2_COURSES).some(x => x.code === c);
      if (isLocked && locked[c] !== undefined) final[c] = locked[c];
      else if (!final[c] && locked[c]) final[c] = locked[c];
    });
    return final;
  }, [sheetGrades, userGrades]);

  const setGrade = (code, val) => setUserGrades(p => ({ ...p, [code]: val }));

  // ── Stats ────────────────────────────────────────────────────────────────
  const s1stat = useMemo(() => computeGPA(grades, SEM1_COURSES), [grades]);
  const s2stat = useMemo(() => computeGPA(grades, SEM2_COURSES), [grades]);
  const s3stat = useMemo(() => computeGPA(grades, SEM3_COURSES), [grades]);
  const l1stat = useMemo(() => computeGPA(grades, L1_COURSES),   [grades]);

  const batchStats = useMemo(() => {
    const gpas = sheetData
      .map(r => {
        const g = {};
        ALL_CODES.forEach(c => { g[c] = r[c] || ""; });
        return computeGPA(g, L1_COURSES).gpa;
      }).filter(g => g !== null).sort((a,b) => b-a);
    const avg = gpas.length ? gpas.reduce((a,b)=>a+b,0)/gpas.length : null;
    const rank = l1stat.gpa !== null ? gpas.findIndex(g => g <= l1stat.gpa) + 1 : null;
    const pct  = l1stat.gpa !== null && gpas.length ? ((gpas.filter(g => g < l1stat.gpa).length / gpas.length)*100).toFixed(1) : null;
    return { gpas, avg, rank, total: gpas.length, percentile: pct };
  }, [sheetData, l1stat]);

  const cls = gpaClass(l1stat.gpa);

  // remaining credits (full 90-credit degree minus 2 non-GPA = 88 GPA credits)
  const totalGPACredits = 88;
  const remainingCredits = totalGPACredits - l1stat.credits;
  const neededGPA = remainingCredits > 0 && l1stat.credits > 0
    ? (targetGPA * totalGPACredits - (l1stat.gpa || 0) * l1stat.credits) / remainingCredits
    : null;

  // chart data
  const semChartData = [
    { name: "Sem I",   GPA: s1stat.gpa, Target: targetGPA },
    { name: "Sem II",  GPA: s2stat.gpa, Target: targetGPA },
    { name: "Sem III", GPA: s3stat.gpa, Target: targetGPA },
  ].filter(d => d.GPA !== null);

  const subjectChartData = useMemo(() => {
    return L1_COURSES.map(c => {
      const myPts  = gradeToPoints(grades[c.code]);
      // batch average for this course
      const batchPts = sheetData.map(r => gradeToPoints(r[c.code])).filter(p => p !== null);
      const batchAvg = batchPts.length ? batchPts.reduce((a,b)=>a+b,0)/batchPts.length : null;
      return { name: c.code.replace("FE ",""), me: myPts, batch: batchAvg !== null ? parseFloat(batchAvg.toFixed(2)) : null };
    });
  }, [grades, sheetData]);

  // histogram
  const histData = useMemo(() => {
    const buckets = {};
    const step = 0.25;
    for (let v = 0; v <= 4; v += step) {
      const key = v.toFixed(2);
      buckets[key] = 0;
    }
    batchStats.gpas.forEach(g => {
      const b = (Math.floor(g / step) * step).toFixed(2);
      if (buckets[b] !== undefined) buckets[b]++;
    });
    return Object.entries(buckets).map(([gpa, count]) => ({
      gpa: parseFloat(gpa), count,
      isMe: l1stat.gpa !== null && Math.abs(parseFloat(gpa) - Math.floor(l1stat.gpa / step) * step) < 0.001
    }));
  }, [batchStats, l1stat]);

  const generatePDF = () => {
    if (!studentId) return;
    const html = buildReportHTML(studentId, grades, sheetData, targetGPA);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  // ── UI helpers ───────────────────────────────────────────────────────────
  const T = { bg: "#0f1117", card: "#1a1d2e", border: "#2d3148", muted: "#64748b", dim: "#475569", text: "#e2e8f0", sub: "#94a3b8" };

  const Card = ({ children, style={} }) => (
    <div style={{ background: T.card, border:`1px solid ${T.border}`, borderRadius:14, ...style }}>{children}</div>
  );
  const CardHead = ({ children }) => (
    <div style={{ padding:"14px 20px", borderBottom:`1px solid ${T.border}`, fontSize:14, fontWeight:700, color:"#c7d2fe" }}>{children}</div>
  );

  const gradeSelect = (code, isLocked) => (
    <select
      disabled={isLocked}
      value={grades[code] || ""}
      onChange={e => setGrade(code, e.target.value)}
      style={{
        background: grades[code] && grades[code] !== "-" ? gradeColor(grades[code])+"22" : "#0f1117",
        border:`1px solid ${grades[code] && grades[code]!=="-" ? gradeColor(grades[code])+"66" : T.border}`,
        borderRadius:6, color: grades[code]==="- " ? "#ef4444" : grades[code] ? gradeColor(grades[code]) : T.muted,
        padding:"4px 8px", fontSize:13, fontWeight:700, cursor: isLocked?"not-allowed":"pointer", outline:"none",
        opacity: isLocked ? 0.7 : 1,
      }}
    >
      <option value="">—</option>
      <option value="-">ABS</option>
      {GRADE_SCALE.map(gs => <option key={gs.label} value={gs.label}>{gs.label}</option>)}
    </select>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:T.bg, minHeight:"100vh", color:T.text }}>

      {/* ── Header ── */}
      <div style={{ background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#1e1b4b 100%)", borderBottom:`1px solid #312e81`, padding:"20px 28px" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:"0.15em", color:"#a5b4fc", textTransform:"uppercase" }}>University of Colombo · Dept. of Mathematics · Batch 2025</div>
            <h1 style={{ margin:"4px 0 0", fontSize:22, fontWeight:800, color:"#fff", letterSpacing:"-0.02em" }}>BSc Financial Engineering — GPA Dashboard</h1>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            {/* Target GPA */}
            <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"8px 16px" }}>
              <div style={{ fontSize:10, color:"#a5b4fc", textTransform:"uppercase", letterSpacing:".1em" }}>Target GPA</div>
              <input type="number" min="0" max="4" step="0.05" value={targetGPA}
                onChange={e => setTargetGPA(parseFloat(e.target.value)||0)}
                style={{ background:"transparent", border:"none", color:"#fbbf24", fontSize:24, fontWeight:800, width:70, outline:"none", padding:0 }}
              />
            </div>
            {/* PDF button */}
            {studentId && (
              <button onClick={generatePDF} style={{
                background:"linear-gradient(135deg,#6366f1,#4f46e5)", border:"none", borderRadius:10,
                color:"#fff", padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer",
                display:"flex", alignItems:"center", gap:8,
              }}>
                📄 Export PDF Report
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"24px 28px" }}>

        {/* ── Student Selector ── */}
        <Card style={{ marginBottom:24, padding:"20px 24px" }}>
          <div style={{ fontSize:13, color:"#a5b4fc", fontWeight:600, marginBottom:12, textTransform:"uppercase", letterSpacing:".08em" }}>
            🔍 Select Student Registration ID
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"flex-start", flexWrap:"wrap" }}>
            <div ref={dropRef} style={{ position:"relative", width:280 }}>
              <input
                placeholder="Search reg ID (e.g. 25SFE 006)…"
                value={searchQ}
                onChange={e => { setSearchQ(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
                style={{
                  width:"100%", background:"#0f1117", border:`1px solid ${T.border}`,
                  borderRadius:8, color:T.text, padding:"10px 14px", fontSize:14, outline:"none",
                }}
              />
              {showDrop && filteredIds.length > 0 && (
                <div style={{
                  position:"absolute", top:"100%", left:0, right:0, background:"#1e2236",
                  border:`1px solid ${T.border}`, borderRadius:8, zIndex:100,
                  maxHeight:220, overflowY:"auto", boxShadow:"0 8px 24px #000a",
                }}>
                  {filteredIds.map(id => (
                    <div key={id} onClick={() => {
                      setStudentId(id); setSearchQ(id); setShowDrop(false); setUserGrades({}); setActiveTab("results");
                    }} style={{
                      padding:"9px 14px", fontSize:13, fontFamily:"monospace",
                      cursor:"pointer", color: id===studentId ? "#c7d2fe" : T.text,
                      background: id===studentId ? "#312e81" : "transparent",
                      borderBottom:`1px solid ${T.border}22`,
                    }}
                      onMouseEnter={e => e.target.style.background="#312e8166"}
                      onMouseLeave={e => e.target.style.background=id===studentId?"#312e81":"transparent"}
                    >{id}</div>
                  ))}
                </div>
              )}
            </div>
            {loading && <div style={{ color:T.muted, fontSize:13, paddingTop:10 }}>⟳ Loading batch data…</div>}
            {error && <div style={{ color:"#f87171", fontSize:13, paddingTop:10 }}>⚠ {error} — using offline mode</div>}
            {studentId && (
              <div style={{ paddingTop:8, fontSize:13 }}>
                <span style={{ color:T.muted }}>Loaded: </span>
                <span style={{ color:"#c7d2fe", fontWeight:700, fontFamily:"monospace" }}>{studentId}</span>
                <span style={{ marginLeft:12, color:T.muted }}>· FE 1021–1030 locked from sheet · FE 1031–1035 editable</span>
              </div>
            )}
          </div>
        </Card>

        {!studentId ? (
          <div style={{ textAlign:"center", padding:"60px 0", color:T.muted }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🎓</div>
            <div style={{ fontSize:16, fontWeight:600 }}>Select your Registration ID above to view your GPA dashboard</div>
            <div style={{ fontSize:13, marginTop:6 }}>
              {allIds.length > 0 ? `${allIds.length} students loaded from batch database` : "Loading batch data…"}
            </div>
          </div>
        ) : (
          <>
            {/* ── KPI Row ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:24 }}>
              {[
                { label:"Level I GPA",       val: l1stat.gpa!==null ? l1stat.gpa.toFixed(3) : "—",         color: cls.color,    sub: cls.label },
                { label:"Batch Rank",        val: batchStats.rank!==null ? `${batchStats.rank} / ${batchStats.total}` : "—", color:"#6366f1", sub:"of graded students" },
                { label:"Percentile",        val: batchStats.percentile!==null ? `${batchStats.percentile}%` : "—", color:"#10b981", sub:"above peers" },
                { label:"Batch Avg GPA",     val: batchStats.avg!==null ? batchStats.avg.toFixed(3) : "—", color:"#f59e0b", sub:"for comparison" },
                { label:"Credits Earned",    val: l1stat.credits,   color:"#60a5fa",  sub:"of 88 GPA credits" },
                { label:"Need Per Credit",   val: neededGPA!==null ? (neededGPA>4?"Impossible":neededGPA.toFixed(2)) : "—",
                  color: neededGPA>4?"#f87171":"#a3e635", sub:`to reach GPA ${targetGPA}` },
              ].map((k,i) => (
                <Card key={i} style={{ padding:"16px 18px" }}>
                  <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>{k.label}</div>
                  <div style={{ fontSize:24, fontWeight:800, color:k.color, lineHeight:1.1 }}>{k.val}</div>
                  <div style={{ fontSize:11, color:T.dim, marginTop:4 }}>{k.sub}</div>
                </Card>
              ))}
            </div>

            {/* ── Tabs ── */}
            <div style={{ display:"flex", gap:6, marginBottom:20, borderBottom:`1px solid ${T.border}` }}>
              {[["results","📋 Grades & Results"],["forecast","📈 Forecast"],["batch","👥 Batch Analysis"]].map(([t,l]) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  background: activeTab===t ? "#6366f1" : "transparent",
                  border:"none", borderRadius:"8px 8px 0 0",
                  color: activeTab===t ? "#fff" : T.muted,
                  padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer",
                }}>{l}</button>
              ))}
            </div>

            {/* ══ TAB: RESULTS ════════════════════════════════════════════ */}
            {activeTab === "results" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                {/* Semester summary cards */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                  {[
                    { name:"Semester I", stat:s1stat, courses:SEM1_COURSES },
                    { name:"Semester II", stat:s2stat, courses:SEM2_COURSES },
                    { name:"Semester III ✏", stat:s3stat, courses:SEM3_COURSES },
                  ].map(({ name, stat, courses }) => {
                    const c = gpaClass(stat.gpa);
                    return (
                      <Card key={name} style={{ padding:"16px 20px", borderTop:`3px solid ${c.color}` }}>
                        <div style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:".1em" }}>{name}</div>
                        <div style={{ fontSize:32, fontWeight:800, color:c.color, margin:"6px 0 2px" }}>{stat.gpa!==null?stat.gpa.toFixed(3):"—"}</div>
                        <div style={{ fontSize:12, color:c.color }}>{c.label}</div>
                        <div style={{ fontSize:11, color:T.dim, marginTop:4 }}>{stat.credits}C graded of {courses.reduce((s,x)=>s+x.credits,0)}C</div>
                      </Card>
                    );
                  })}
                </div>

                {/* GPA trend chart */}
                {semChartData.length > 0 && (
                  <Card>
                    <CardHead>GPA Trend — Level I</CardHead>
                    <div style={{ padding:"16px 20px 8px" }}>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={semChartData}>
                          <defs>
                            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                          <XAxis dataKey="name" tick={{fill:T.muted,fontSize:12}} axisLine={false} tickLine={false}/>
                          <YAxis domain={[0,4]} tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                          <Tooltip contentStyle={{background:"#1e2236",border:`1px solid ${T.border}`,borderRadius:8,color:T.text}}
                            formatter={(v,n)=>[v?.toFixed(3),n]}/>
                          <ReferenceLine y={targetGPA} stroke="#fbbf24" strokeDasharray="5 3" strokeWidth={2}
                            label={{value:`Target ${targetGPA}`,fill:"#fbbf24",fontSize:11,position:"insideTopRight"}}/>
                          <Area type="monotone" dataKey="GPA" stroke="#6366f1" strokeWidth={3} fill="url(#g1)"
                            dot={{fill:"#6366f1",r:6,strokeWidth:2,stroke:"#0f1117"}}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                )}

                {/* Grade tables */}
                {[
                  { label:"Semester I — FE 1021 to FE 1025", courses:SEM1_COURSES, locked:true },
                  { label:"Semester II — FE 1026 to FE 1030", courses:SEM2_COURSES, locked:true },
                  { label:"Semester III — FE 1031 to FE 1035 (editable)", courses:SEM3_COURSES, locked:false },
                ].map(({ label, courses, locked }) => (
                  <Card key={label}>
                    <CardHead>{label}</CardHead>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                          {["Code","Course","Cr","Grade","Pts","Total","Rank in Batch"].map(h => (
                            <th key={h} style={{ padding:"9px 16px", textAlign:"left", fontSize:10, color:T.dim, letterSpacing:".08em", textTransform:"uppercase", fontWeight:600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {courses.map((c,i) => {
                          const g = grades[c.code];
                          const p = gradeToPoints(g);
                          const absent = g === "-";
                          // batch rank for this subject
                          const subjectPts = sheetData.map(r => gradeToPoints(r[c.code])).filter(x=>x!==null);
                          const myP = p !== null ? p : null;
                          const subRank = myP !== null && subjectPts.length
                            ? subjectPts.filter(x => x > myP).length + 1 : null;

                          return (
                            <tr key={c.code} style={{ borderBottom:`1px solid ${T.border}22`, background:i%2===0?"transparent":"rgba(255,255,255,0.015)" }}>
                              <td style={{ padding:"9px 16px", fontSize:12, color:T.muted, fontFamily:"monospace" }}>{c.code}</td>
                              <td style={{ padding:"9px 16px", fontSize:13, color:T.text }}>{c.name}</td>
                              <td style={{ padding:"9px 16px", fontSize:12, color:T.sub }}>{c.credits}C</td>
                              <td style={{ padding:"9px 16px" }}>
                                {locked ? (
                                  <span style={{ fontWeight:700, color: absent?"#ef4444": p!==null ? gradeColor(g) : T.dim }}>
                                    {absent ? "ABS" : g || "—"}
                                  </span>
                                ) : gradeSelect(c.code, false)}
                              </td>
                              <td style={{ padding:"9px 16px", fontSize:13, fontWeight:600, color:p!==null?gradeColor(g):T.border }}>
                                {p!==null?p.toFixed(2):"—"}
                              </td>
                              <td style={{ padding:"9px 16px", fontSize:13, color:p!==null?T.text:T.border }}>
                                {p!==null?(p*c.credits).toFixed(2):"—"}
                              </td>
                              <td style={{ padding:"9px 16px", fontSize:12, color:T.sub }}>
                                {subRank!==null ? `${subRank} / ${subjectPts.length}` : "—"}
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

            {/* ══ TAB: FORECAST ═══════════════════════════════════════════ */}
            {activeTab === "forecast" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  {/* Scenario planner */}
                  <Card>
                    <CardHead>Scenario Planner — Remaining {remainingCredits} GPA Credits</CardHead>
                    <div style={{ padding:"8px 0" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse" }}>
                        <thead>
                          <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                            {["If Avg","Points","Final GPA","Class","Hit Target?"].map(h => (
                              <th key={h} style={{ padding:"9px 16px", textAlign:"left", fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:".08em" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {GRADE_SCALE.filter(g=>g.label!=="E").map((gs,i) => {
                            if (remainingCredits <= 0) return null;
                            const projGPA = ((l1stat.gpa||0)*l1stat.credits + gs.points*remainingCredits) / totalGPACredits;
                            const c = gpaClass(projGPA);
                            const hits = projGPA >= targetGPA;
                            return (
                              <tr key={gs.label} style={{ borderBottom:`1px solid ${T.border}22`, background:hits?"rgba(16,185,129,0.06)":"transparent" }}>
                                <td style={{ padding:"8px 16px", fontWeight:700, color:gradeColor(gs.label) }}>{gs.label}</td>
                                <td style={{ padding:"8px 16px", color:T.sub, fontSize:12 }}>{gs.points.toFixed(2)}</td>
                                <td style={{ padding:"8px 16px", fontWeight:700, color:c.color }}>{projGPA.toFixed(3)}</td>
                                <td style={{ padding:"8px 16px", fontSize:12, color:c.color }}>{c.label}</td>
                                <td style={{ padding:"8px 16px", fontWeight:700, color:hits?"#10b981":"#f87171" }}>{hits?"✓":"✗"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Degree roadmap */}
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    <Card style={{ padding:"20px 24px" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#c7d2fe", marginBottom:14 }}>Classification Scale</div>
                      {[
                        { label:"First Class Honours", range:"≥ 3.70", color:"#10b981" },
                        { label:"Second Class (Upper)", range:"3.30 – 3.69", color:"#6366f1" },
                        { label:"Second Class (Lower)", range:"3.00 – 3.29", color:"#f59e0b" },
                        { label:"Pass", range:"2.00 – 2.99", color:"#94a3b8" },
                        { label:"Fail", range:"< 2.00", color:"#f87171" },
                      ].map((c,i) => {
                        const isMe = l1stat.gpa!==null && gpaClass(l1stat.gpa).label===c.label;
                        return (
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10,
                            background:isMe?c.color+"15":"transparent", borderRadius:8, padding:"8px 10px" }}>
                            <div style={{ width:3, height:32, background:c.color, borderRadius:2, flexShrink:0 }}/>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:600, color:c.color, fontSize:13 }}>{c.label}</div>
                              <div style={{ fontSize:11, color:T.dim }}>{c.range}</div>
                            </div>
                            {isMe && <span style={{ fontSize:11, color:c.color, fontWeight:700 }}>◀ You</span>}
                          </div>
                        );
                      })}
                    </Card>

                    <Card style={{ padding:"20px 24px" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#c7d2fe", marginBottom:12 }}>Degree Progress</div>
                      {[
                        { label:"Level I", credits:30, earned:l1stat.credits, color:"#6366f1" },
                        { label:"Level II", credits:30, earned:0, color:"#475569" },
                        { label:"Level III", credits:30, earned:0, color:"#475569" },
                      ].map((lv,i) => (
                        <div key={i} style={{ marginBottom:12 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontSize:12, color:T.sub }}>{lv.label}</span>
                            <span style={{ fontSize:12, color:T.muted }}>{lv.earned}/{lv.credits}C</span>
                          </div>
                          <div style={{ height:8, background:T.border, borderRadius:4, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${Math.min(100,(lv.earned/lv.credits)*100)}%`, background:lv.color, borderRadius:4, transition:"width 0.6s" }}/>
                          </div>
                        </div>
                      ))}
                      <div style={{ marginTop:12, display:"flex", justifyContent:"space-between" }}>
                        <span style={{ fontSize:12, color:T.sub }}>Total (90C)</span>
                        <span style={{ fontSize:12, color:"#6366f1", fontWeight:700 }}>{l1stat.credits}/90C ({((l1stat.credits/90)*100).toFixed(0)}%)</span>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Future courses */}
                <Card>
                  <CardHead>Level II & III Planner — Enter Expected Grades</CardHead>
                  <div style={{ padding:"12px 16px" }}>
                    <div style={{ fontSize:12, color:T.muted, marginBottom:12 }}>Set expected grades for future courses to refine your final GPA projection.</div>
                    {[
                      { title:"Level II Courses", courses:L2_COURSES },
                      { title:"Level III Core Courses", courses:L3_CORE },
                    ].map(({ title, courses }) => (
                      <div key={title} style={{ marginBottom:20 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#a5b4fc", marginBottom:8, textTransform:"uppercase", letterSpacing:".08em" }}>{title}</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:8 }}>
                          {courses.map(c => (
                            <div key={c.code} style={{ display:"flex", alignItems:"center", gap:10, background:T.bg, borderRadius:8, padding:"8px 12px", border:`1px solid ${T.border}` }}>
                              <span style={{ fontSize:10, color:T.dim, fontFamily:"monospace", flexShrink:0 }}>{c.code}</span>
                              <span style={{ fontSize:12, color:T.sub, flex:1, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{c.name}</span>
                              <span style={{ fontSize:11, color:T.dim, flexShrink:0 }}>{c.credits}C</span>
                              {gradeSelect(c.code, false)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ══ TAB: BATCH ANALYSIS ═════════════════════════════════════ */}
            {activeTab === "batch" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                {/* Histogram */}
                <Card>
                  <CardHead>Batch GPA Distribution — Level I (Sem I + II)</CardHead>
                  <div style={{ padding:"16px 20px 8px" }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={histData} margin={{top:5,right:20,left:-20,bottom:5}}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                        <XAxis dataKey="gpa" tickFormatter={v=>v.toFixed(2)} tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{background:"#1e2236",border:`1px solid ${T.border}`,borderRadius:8,color:T.text}}
                          formatter={(v,n,p)=>[`${v} students`, `GPA ${p.payload.gpa.toFixed(2)}`]}/>
                        {l1stat.gpa !== null && (
                          <ReferenceLine x={(Math.floor(l1stat.gpa/0.25)*0.25).toFixed(2)} stroke="#f87171" strokeWidth={2} strokeDasharray="5 3"
                            label={{value:"You",fill:"#f87171",fontSize:11,position:"top"}}/>
                        )}
                        {batchStats.avg !== null && (
                          <ReferenceLine x={(Math.floor(batchStats.avg/0.25)*0.25).toFixed(2)} stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 3"
                            label={{value:"Avg",fill:"#fbbf24",fontSize:11,position:"top"}}/>
                        )}
                        <Bar dataKey="count" radius={[3,3,0,0]}>
                          {histData.map((d,i) => <Cell key={i} fill={d.isMe?"#6366f1":"#334155"}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Subject comparison */}
                <Card>
                  <CardHead>Subject Performance — You vs Batch Average</CardHead>
                  <div style={{ padding:"16px 20px 8px" }}>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={subjectChartData} margin={{top:5,right:20,left:-20,bottom:5}}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                        <XAxis dataKey="name" tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                        <YAxis domain={[0,4]} tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{background:"#1e2236",border:`1px solid ${T.border}`,borderRadius:8,color:T.text}}
                          formatter={(v)=>[v!==null?v.toFixed(2):"absent"]}/>
                        <Legend wrapperStyle={{color:T.sub,fontSize:12}}/>
                        <Bar dataKey="batch" name="Batch Avg" fill="#334155" radius={[3,3,0,0]}/>
                        <Bar dataKey="me" name="You" fill="#6366f1" radius={[3,3,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Top performers */}
                <Card>
                  <CardHead>Top 10 Students — Batch Leaderboard (Level I, Sem I+II)</CardHead>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                        {["Rank","Reg ID","Sem I GPA","Sem II GPA","Avg GPA","Class"].map(h => (
                          <th key={h} style={{ padding:"9px 16px", textAlign:"left", fontSize:10, color:T.dim, textTransform:"uppercase", letterSpacing:".08em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetData
                        .map(r => {
                          const g = {};
                          ALL_CODES.forEach(c => { g[c] = r[c]||""; });
                          const s1 = computeGPA(g, SEM1_COURSES);
                          const s2 = computeGPA(g, SEM2_COURSES);
                          const avg = computeGPA(g, [...SEM1_COURSES,...SEM2_COURSES]);
                          return { id: r["Reg. No"]||r["Reg ID"], s1:s1.gpa, s2:s2.gpa, avg:avg.gpa };
                        })
                        .filter(x => x.avg !== null)
                        .sort((a,b) => b.avg-a.avg)
                        .slice(0,10)
                        .map((s,i) => {
                          const isMe = s.id === studentId;
                          const c = gpaClass(s.avg);
                          return (
                            <tr key={s.id} style={{ borderBottom:`1px solid ${T.border}22`, background:isMe?"#312e8133":"transparent" }}>
                              <td style={{ padding:"8px 16px", fontWeight:700, color:i===0?"#fbbf24":i===1?"#94a3b8":i===2?"#f97316":T.sub }}>{i+1}</td>
                              <td style={{ padding:"8px 16px", fontFamily:"monospace", fontSize:13, color:isMe?"#c7d2fe":T.text, fontWeight:isMe?700:400 }}>
                                {s.id} {isMe && <span style={{ fontSize:10, color:"#6366f1", marginLeft:6 }}>← YOU</span>}
                              </td>
                              <td style={{ padding:"8px 16px", color:gpaClass(s.s1).color, fontWeight:600 }}>{s.s1!==null?s.s1.toFixed(3):"—"}</td>
                              <td style={{ padding:"8px 16px", color:gpaClass(s.s2).color, fontWeight:600 }}>{s.s2!==null?s.s2.toFixed(3):"—"}</td>
                              <td style={{ padding:"8px 16px", color:c.color, fontWeight:800 }}>{s.avg.toFixed(3)}</td>
                              <td style={{ padding:"8px 16px", fontSize:12, color:c.color }}>{c.label}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </Card>

                {/* Grade dist across batch */}
                <Card>
                  <CardHead>Grade Frequency — All Subjects · Entire Batch</CardHead>
                  <div style={{ padding:"16px 20px 8px" }}>
                    {(() => {
                      const dist = {};
                      sheetData.forEach(r => {
                        ALL_CODES.forEach(c => {
                          const g = r[c];
                          if (g && g !== "-" && g !== "") dist[g] = (dist[g]||0)+1;
                        });
                      });
                      const data = Object.entries(dist).sort((a,b)=>(gradeToPoints(b[0])||0)-(gradeToPoints(a[0])||0)).map(([grade,count])=>({grade,count}));
                      return (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                            <XAxis dataKey="grade" tick={{fill:T.muted,fontSize:12}} axisLine={false} tickLine={false}/>
                            <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                            <Tooltip contentStyle={{background:"#1e2236",border:`1px solid ${T.border}`,borderRadius:8,color:T.text}}/>
                            <Bar dataKey="count" radius={[4,4,0,0]}>
                              {data.map((d,i) => <Cell key={i} fill={gradeColor(d.grade)}/>)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </Card>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop:28, textAlign:"center", fontSize:11, color:"#2d3148" }}>
          BSc Financial Engineering · University of Colombo · Department of Mathematics · 2025 Handbook · Data from Google Sheets
        </div>
      </div>
    </div>
  );
}
