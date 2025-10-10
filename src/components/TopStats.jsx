import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export default function TopStats({ countsByType, timeline }) {
  const data = Object.entries(countsByType).map(([name, value]) => ({ name, value }));
  const COLORS = ['#60a5fa', '#f472b6', '#f59e0b', '#34d399', '#a78bfa', '#ef4444', '#22d3ee', '#93c5fd'];

  return (
    <div style={{ display:'flex', gap:12 }}>
      <div className="card" style={{ width: 280, height: 160 }}>
        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>Incident % Categories</div>
        <div style={{ width:'100%', height:'calc(100% - 18px)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ width: 520, height: 160 }}>
        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:6 }}>Live Incident Count per Category Type</div>
        <div style={{ width:'100%', height:'calc(100% - 18px)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <XAxis dataKey="t" hide />
              <YAxis hide />
              <Tooltip />
              {Object.keys(countsByType).slice(0, 5).map((k) => (
                <Line key={k} type="monotone" dataKey={k} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
