import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-md border border-border rounded-xl shadow-lg p-2.5 text-xs">
      <p className="font-mono text-muted mb-1 font-medium">t = {label} menit</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-charcoal">{p.name}:</span>
          <span className="font-mono font-semibold">
            {typeof p.value === 'number' ? (p.value.toFixed ? p.value.toFixed(1) : p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TimelineChart({ data, currentHour, params }) {
  const [viewMode, setViewMode] = useState('standard') // 'standard' | 'qos'
  const hourStr = `${Math.floor(currentHour).toString().padStart(2, '0')}:${Math.floor((currentHour % 1) * 60).toString().padStart(2, '0')}`

  const maxLambda = Math.max(1, ...(data.length > 0 ? data.map(d => Number(d.lambda) || 0) : [1]))
  const maxRho = Math.max(1, ...(data.length > 0 ? data.map(d => Number(d.rho) || 0) : [1]))
  const maxLatency = Math.max(20, ...(data.length > 0 ? data.map(d => Number(d.latency) || 0) : [20]))

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">
            Timeline Telemetri
          </h3>
          {params.timeVarying && (
            <span className="text-xs font-mono text-sfblue bg-blue-50 px-2 py-0.5 rounded-full font-medium">
              {hourStr}
            </span>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-lg p-0.5 border border-border/80 text-[10px]">
            <button
              onClick={() => setViewMode('standard')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                viewMode === 'standard' ? 'bg-sfblue text-white shadow-xs' : 'text-muted hover:text-charcoal'
              }`}
            >
              Antrian & Trafik
            </button>
            <button
              onClick={() => setViewMode('qos')}
              className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                viewMode === 'qos' ? 'bg-sfblue text-white shadow-xs' : 'text-muted hover:text-charcoal'
              }`}
            >
              QoS & Latensi
            </button>
          </div>
          <span className="text-[10px] text-muted font-mono">{data.length} pts</span>
        </div>
      </div>

      {/* Grid of 4 charts */}
      <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
        {viewMode === 'standard' ? (
          <>
            {/* Active Users chart */}
            <div className="bg-white rounded-xl p-2.5 shadow-card border border-border/40 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wide font-medium">Pengguna Aktif</span>
                <span className="text-[10px] font-mono font-semibold text-sfblue">
                  {data[data.length - 1]?.users ?? 0} / {params.K}
                </span>
              </div>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 2, right: 6, bottom: 2, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
                    <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, params.K]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="users" stroke="#0071E3" strokeWidth={1.5} dot={false} name="Pengguna" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Blocking Rate chart */}
            <div className="bg-white rounded-xl p-2.5 shadow-card border border-border/40 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wide font-medium">Blocking Rate (%)</span>
                <span className="text-[10px] font-mono font-semibold text-amber-500">
                  {data[data.length - 1]?.blockingRate ?? 0}%
                </span>
              </div>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 2, right: 6, bottom: 2, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
                    <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="blockingRate" stroke="#FF9500" strokeWidth={1.5} dot={false} name="Block Rate %" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Lambda chart */}
            <div className="bg-white rounded-xl p-2.5 shadow-card border border-border/40 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wide font-medium">λ_total(t) Arrival Rate</span>
                <span className="text-[10px] font-mono font-semibold text-indigo-500">
                  {data[data.length - 1]?.lambda ?? 0} usr/m
                </span>
              </div>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 2, right: 6, bottom: 2, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
                    <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, Math.ceil(maxLambda * 1.1)]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="lambda" stroke="#5856D6" strokeWidth={1.5} dot={false} name="λ total" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rho chart */}
            <div className="bg-white rounded-xl p-2.5 shadow-card border border-border/40 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wide font-medium">ρ Traffic Load</span>
                <span className="text-[10px] font-mono font-semibold text-emerald-600">
                  {data[data.length - 1]?.rho ?? 0}
                </span>
              </div>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 2, right: 6, bottom: 2, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
                    <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, Math.ceil(maxRho * 1.2)]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="rho" stroke="#34C759" strokeWidth={1.5} dot={false} name="ρ" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Latency chart */}
            <div className="bg-white rounded-xl p-2.5 shadow-card border border-border/40 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wide font-medium">Est. Contention Latency</span>
                <span className="text-[10px] font-mono font-semibold text-blue-600">
                  {data[data.length - 1]?.latency ?? 8} ms
                </span>
              </div>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 2, right: 6, bottom: 2, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
                    <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, Math.ceil(maxLatency * 1.15)]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="latency" stroke="#0071E3" strokeWidth={1.5} dot={false} name="Latency (ms)" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SLA Compliance chart */}
            <div className="bg-white rounded-xl p-2.5 shadow-card border border-border/40 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wide font-medium">SLA Compliance Rate</span>
                <span className="text-[10px] font-mono font-semibold text-emerald-600">
                  {data[data.length - 1]?.slaCompliance ?? 100}%
                </span>
              </div>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 2, right: 6, bottom: 2, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
                    <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="slaCompliance" stroke="#34C759" strokeWidth={1.5} dot={false} name="SLA %" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Erlang-B B(K, A) chart */}
            <div className="bg-white rounded-xl p-2.5 shadow-card border border-border/40 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wide font-medium">Erlang-B B(K, A) Prob.</span>
                <span className="text-[10px] font-mono font-semibold text-purple-600">
                  {data[data.length - 1]?.pk ?? 0}%
                </span>
              </div>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 2, right: 6, bottom: 2, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
                    <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="pk" stroke="#AF52DE" strokeWidth={1.5} dot={false} name="Erlang-B %" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Total Rejected Sessions */}
            <div className="bg-white rounded-xl p-2.5 shadow-card border border-border/40 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-muted uppercase tracking-wide font-medium">Cumulative Rejections</span>
                <span className="text-[10px] font-mono font-semibold text-rose-500">
                  {data[data.length - 1]?.blocked ?? 0} usr
                </span>
              </div>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 2, right: 6, bottom: 2, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F7" />
                    <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 8, fill: '#86868B' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="blocked" stroke="#FF2D55" strokeWidth={1.5} dot={false} name="Blocked Count" isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
