import React from 'react';
import { Card } from '../common/Card';

export const KpiGrid = ({ metrics }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
    {metrics.map((metric, index) => (
      <Card key={metric.label} style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>{metric.label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: metric.color, lineHeight: 1.1 }}>{metric.value}</div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>{metric.sub}</div>
      </Card>
    ))}
  </div>
);
