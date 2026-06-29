import React from 'react';

export const DashboardHeader = ({ targetGPA, currentGPA, onTargetChange, onExport, canExport }) => (
  <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%)', borderBottom: '1px solid #312e81', padding: '20px 28px' }}>
    <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
      <div>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#a5b4fc', textTransform: 'uppercase' }}>University of Colombo · Dept. of Mathematics · Batch 2025</div>
        <h1 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>BSc Financial Engineering — GPA Dashboard</h1>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 16px' }}>
          <div style={{ fontSize: 10, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '.1em' }}>Target GPA</div>
          <input type="number" min="0" max="4" step="0.05" value={targetGPA}
            onChange={(event) => onTargetChange(parseFloat(event.target.value) || 0)}
            style={{ background: 'transparent', border: 'none', color: '#fbbf24', fontSize: 24, fontWeight: 800, width: 70, outline: 'none', padding: 0 }}
          />
        </div>
        <button onClick={onExport} disabled={!canExport} style={{
          background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 10,
          color: '#fff', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: canExport ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', gap: 8, opacity: canExport ? 1 : 0.7,
        }}>
          📄 Export PDF Report
        </button>
      </div>
    </div>
  </div>
);
