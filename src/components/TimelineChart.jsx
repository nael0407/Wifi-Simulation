import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-xl shadow-card p-3 text-xs">
      <p className="font-mono text-muted mb-1">t = {label} menit</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-charcoal">{p.name}:</span>
          <span className="font-mono font-semibold">{typeof p.value === 'number' ? p.value.toFixed ? p.value.toFixed(1) : p.value : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function TimelineChart({ data, currentHour, params }) {
  const hourStr = `${Math.floor(currentHour).toString().padStart(2, '0')}:${Math.floor((currentHour % 1) * 60).toString().padStart(2, '0')}`

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
            Timeline Simulasi
          </h3>
          {params.timeVarying && (
            <span className="text-xs font-mono text-sfblue bg-blue-50 px-2 py-0.5 rounded-full">
              🕐 {hourStr}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted">{data.length} data points</span>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Active Users chart */}
        <div className="bg-white rounded-xl p-3 shadow-card">
          <p className="text-[10px] text-muted uppercase tracking-wide mb-2 font-medium">Pengguna Aktif</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data} margin={{ top: 2, right: 8, bottom: 2, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#86868B' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, params.K]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#0071E3"
                strokeWidth={1.5}
                dot={false}
                name="Pengguna"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Blocking Rate chart */}
        <div className="bg-white rounded-xl p-3 shadow-card">
          <p className="text-[10px] text-muted uppercase tracking-wide mb-2 font-medium">Blocking Rate (%)</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data} margin={{ top: 2, right: 8, bottom: 2, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#86868B' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="blockingRate"
                stroke="#FF9500"
                strokeWidth={1.5}
                dot={false}
                name="Block Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Lambda chart */}
        <div className="bg-white rounded-xl p-3 shadow-card">
          <p className="text-[10px] text-muted uppercase tracking-wide mb-2 font-medium">λ_total (t) — Arrival Rate</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data} margin={{ top: 2, right: 8, bottom: 2, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#86868B' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, Math.ceil(Math.max(...data.map(d => d.lambda || 0), 1))]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="lambda"
                stroke="#5856D6"
                strokeWidth={1.5}
                dot={false}
                name="λ total"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Rho chart */}
        <div className="bg-white rounded-xl p-3 shadow-card">
          <p className="text-[10px] text-muted uppercase tracking-wide mb-2 font-medium">ρ — Traffic Intensity</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={data} margin={{ top: 2, right: 8, bottom: 2, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#86868B' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, Math.ceil(Math.max(...data.map(d => d.rho || 0), 1))]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="rho"
                stroke="#34C759"
                strokeWidth={1.5}
                dot={false}
                name="ρ"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
