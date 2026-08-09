import React from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

export const BatchDistributionChart = ({ data, currentGPA, avgGPA }) => (
  <ResponsiveContainer width="100%" height={220}>
    <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" vertical={false} />
      <XAxis dataKey="gpa" tickFormatter={(value) => value.toFixed(2)} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ background: '#1e2236', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0' }} formatter={(value, name, payload) => [`${value} students`, `GPA ${payload.payload.gpa.toFixed(2)}`]} />
      {currentGPA !== null && (
        <ReferenceLine
          x={Number(currentGPA.toFixed(2))}
          stroke="#f87171"
          strokeWidth={2}
          strokeDasharray="5 3"
          isFront
          label={{ value: `Your GPA: ${Number(currentGPA.toFixed(2))}`, fill: '#f87171', fontSize: 11, position: 'top' }}
        />
      )}
      {avgGPA !== null && (
        <ReferenceLine
          x={Number(avgGPA.toFixed(2))}
          stroke="#fbbf24"
          strokeWidth={2}
          strokeDasharray="5 3"
          isFront
          label={{ value: `Avg GPA: ${Number(avgGPA.toFixed(2))}`, fill: '#fbbf24', fontSize: 11, position: 'top' }}
        />
      )}
      <Bar dataKey="count" radius={[3, 3, 0, 0]}>
        {data.map((entry, index) => <Cell key={`${entry.gpa}-${index}`} fill={entry.isMe ? '#6366f1' : '#334155'} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
