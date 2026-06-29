import React from 'react';
import { Card } from '../common/Card';

export const StudentSelector = ({ searchQuery, onSearchChange, onSelectStudent, onFocus, filteredIds, loading, error, selectedStudentId, allIds, showDropdown, onToggleDropdown, dropRef }) => (
  <Card style={{ marginBottom: 24, padding: '20px 24px' }}>
    <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.08em' }}>
      🔍 Select Student Registration ID
    </div>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div ref={dropRef} style={{ position: 'relative', width: 280 }}>
        <input
          placeholder="Search reg ID (e.g. 25SFE 006)…"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          onFocus={onFocus}
          style={{ width: '100%', background: '#0f1117', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0', padding: '10px 14px', fontSize: 14, outline: 'none' }}
        />
        {showDropdown && filteredIds.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e2236', border: '1px solid #2d3148', borderRadius: 8, zIndex: 100, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px #000a' }}>
            {filteredIds.map((id) => (
              <div key={id} onClick={() => onSelectStudent(id)} style={{ padding: '9px 14px', fontSize: 13, fontFamily: 'monospace', cursor: 'pointer', color: id === selectedStudentId ? '#c7d2fe' : '#e2e8f0', background: id === selectedStudentId ? '#312e81' : 'transparent', borderBottom: '1px solid #2d3148' }}>
                {id}
              </div>
            ))}
          </div>
        )}
      </div>
      {loading && <div style={{ color: '#64748b', fontSize: 13, paddingTop: 10 }}>⟳ Loading batch data…</div>}
      {error && <div style={{ color: '#f87171', fontSize: 13, paddingTop: 10 }}>⚠ {error}</div>}
      {selectedStudentId && (
        <div style={{ paddingTop: 8, fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>Loaded: </span>
          <span style={{ color: '#c7d2fe', fontWeight: 700, fontFamily: 'monospace' }}>{selectedStudentId}</span>
          <span style={{ marginLeft: 12, color: '#64748b' }}>· FE 1021–1030 locked from sheet · FE 1031–1035 editable</span>
        </div>
      )}
    </div>
  </Card>
);
