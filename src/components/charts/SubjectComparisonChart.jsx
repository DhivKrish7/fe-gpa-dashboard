import React from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

export const SubjectComparisonChart = ({ data, type = 'bar' }) => (
  <ResponsiveContainer width="100%" height={260}>
    {type === 'line' ? (
      <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 4]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: '#1e2236', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0' }} formatter={(value) => [value !== null ? value.toFixed(2) : 'absent']} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
        <Line type="monotone" dataKey="batch" name="Batch Avg" stroke="#334155" strokeWidth={3} dot={{ fill: '#334155' }} />
        <Line type="monotone" dataKey="me" name="You" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1' }} />
      </LineChart>
    ) : (
      <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 4]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: '#1e2236', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0' }} formatter={(value) => [value !== null ? value.toFixed(2) : 'absent']} />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
        <Bar dataKey="batch" name="Batch Avg" fill="#334155" radius={[3, 3, 0, 0]} />
        <Bar dataKey="me" name="You" fill="#6366f1" radius={[3, 3, 0, 0]} />
      </BarChart>
    )}
  </ResponsiveContainer>
);
