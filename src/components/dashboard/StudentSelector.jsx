import React from 'react';
import { Card } from '../common/Card';

const T = {
  bg: '#0f1117', card: '#1a1d2e', border: '#2d3148',
  muted: '#64748b', text: '#e2e8f0', sub: '#94a3b8',
};

export const StudentSelector = ({
  onSelectStudent,
  selectedStudentId,
  allIds,
  loading,
  error,
}) => (
  <Card style={{ marginBottom: 24, padding: '20px 24px' }}>
    <div style={{
      fontSize: 13, color: '#a5b4fc', fontWeight: 600,
      marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.08em',
    }}>
      🎓 Select Student Registration ID
    </div>

    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
      {loading && !allIds.length ? (
        <div style={{ color: T.muted, fontSize: 13 }}>⟳ Loading student list…</div>
      ) : (
        <select
          value={selectedStudentId}
          onChange={(e) => onSelectStudent(e.target.value)}
          style={{
            background: '#0f1117',
            border: `1px solid ${selectedStudentId ? '#6366f1' : T.border}`,
            borderRadius: 8,
            color: selectedStudentId ? '#c7d2fe' : T.muted,
            padding: '10px 14px',
            fontSize: 14,
            fontWeight: selectedStudentId ? 700 : 400,
            fontFamily: 'monospace',
            outline: 'none',
            cursor: 'pointer',
            minWidth: 220,
          }}
        >
          <option value="">— Select your Reg ID —</option>
          {allIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      )}

      {error && (
        <div style={{ color: '#f87171', fontSize: 13 }}>⚠ {error}</div>
      )}

      {selectedStudentId && (
        <div style={{ fontSize: 12, color: T.muted }}>
          Sem I &amp; II locked from database · Sem III editable
        </div>
      )}
    </div>
  </Card>
);
