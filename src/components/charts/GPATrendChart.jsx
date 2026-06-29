import React from 'react';
import { AreaChart, Area, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, XAxis, YAxis } from 'recharts';

export const GPATrendChart = ({ data, targetGPA }) => (
  <ResponsiveContainer width="100%" height={220}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
      <YAxis domain={[0, 4]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ background: '#1e2236', border: '1px solid #2d3148', borderRadius: 8, color: '#e2e8f0' }} formatter={(value) => [value?.toFixed(3)]} />
      <ReferenceLine y={targetGPA} stroke="#fbbf24" strokeDasharray="5 3" strokeWidth={2} label={{ value: `Target ${targetGPA}`, fill: '#fbbf24', fontSize: 11, position: 'insideTopRight' }} />
      <Area type="monotone" dataKey="GPA" stroke="#6366f1" strokeWidth={3} fill="url(#g1)" dot={{ fill: '#6366f1', r: 6, strokeWidth: 2, stroke: '#0f1117' }} />
    </AreaChart>
  </ResponsiveContainer>
);
