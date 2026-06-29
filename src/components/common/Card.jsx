import React from 'react';

export const Card = ({ children, style = {}, className = '', ...props }) => (
  <div className={className} style={{ background: '#1a1d2e', border: '1px solid #2d3148', borderRadius: 14, ...style }} {...props}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, children }) => (
  <div style={{ padding: '14px 20px', borderBottom: '1px solid #2d3148', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#c7d2fe' }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{subtitle}</div> : null}
    </div>
    {children}
  </div>
);
