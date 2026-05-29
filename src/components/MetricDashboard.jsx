import React from 'react'
import { CLASS_CONFIG } from '../simulationEngine.js'

function KpiCard({ label, value, unit, sub, accent }) {
  return (
    <div className="bento-card bg-white rounded-xl p-4 shadow-card">
      <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span
          className="text-lg font-bold font-mono leading-tight"
          style={{ color: accent || '#1D1D1F' }}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  )
}

export default function MetricDashboard({ simState, params }) {
  const { users, blockedCount, classStats, blockingRate, rho, pk } = simState
  const totalServed = classStats.reduce((s, c) => s + c.served, 0)

  const classThroughputs = classStats.map((st, i) => {
    const activeUsers = users.filter(u => u.classId === i)
    const avgThroughput = activeUsers.length > 0
      ? activeUsers.reduce((s, u) => s + (u.throughput || 0), 0) / activeUsers.length
      : 0
    return { ...CLASS_CONFIG[i], avgThroughput, count: activeUsers.length, blocked: st.blocked }
  })

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Active Users"
          value={users.length}
          unit={`/ ${params.K}`}
          sub={`${((users.length / params.K) * 100).toFixed(0)}% kapasitas`}
          accent="#0071E3"
        />
        <KpiCard
          label="Blocking Rate"
          value={blockingRate.toFixed(1)}
          unit="%"
          sub={`${blockedCount} total blocked`}
          accent={blockingRate > 10 ? '#FF3B30' : blockingRate > 5 ? '#FF9500' : '#34C759'}
        />
        <KpiCard
          label="Traffic Intensity ρ"
          value={rho.toFixed(3)}
          unit=""
          sub={rho >= 1 ? '⚠ Sistem jenuh' : rho > 0.7 ? '⚡ Beban tinggi' : '✓ Stabil'}
          accent={rho >= 1 ? '#FF3B30' : rho > 0.7 ? '#FF9500' : '#34C759'}
        />
        <KpiCard
          label="P_K(t) Blocking Prob"
          value={`${pk > 0 ? (pk * 100).toFixed(2) : '0.00'}`}
          unit="%"
          sub="Formula Erlang-B"
          accent="#5856D6"
        />
      </div>

      {/* Per-class throughput distribution */}
      <div className="bento-card bg-white rounded-xl p-4 shadow-card">
        <p className="text-xs text-muted font-medium uppercase tracking-wide mb-3">
          Distribusi Throughput per Kelas
        </p>
        <div className="space-y-2.5">
          {classThroughputs.map((cls) => {
            const maxTp = Math.max(...classThroughputs.map(c => c.avgThroughput), 1)
            const barWidth = Math.min((cls.avgThroughput / maxTp) * 100, 100)
            return (
              <div key={cls.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                     <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                     {cls.name} <span className="text-muted font-normal">({cls.count})</span>
                  </span>
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{ color: cls.color }}
                  >
                    {cls.avgThroughput.toFixed(1)} Mbps
                  </span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, backgroundColor: cls.color }}
                  />
                </div>
                {/* P10 marker indicator */}
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-muted">
                    {cls.blocked > 0 && (
                      <span className="text-coral">⚠ {cls.blocked} blocked</span>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scheduling policy info */}
      <div className="bento-card bg-white rounded-xl p-3 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted font-medium uppercase tracking-wide">Scheduling Policy</p>
            <p className="text-sm font-semibold text-charcoal mt-0.5">
              {params.scheduling === 'WFQ' ? 'Weighted Fair Queue' : 'Best Effort (Equal Share)'}
            </p>
          </div>
        </div>
      </div>

      {/* Starvation legend */}
      <div className="bento-card bg-white rounded-xl p-3 shadow-card">
        <p className="text-xs text-muted font-medium uppercase tracking-wide mb-2">Status Visual Node</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-charcoal">
            <div className="w-3 h-3 rounded-full bg-sfblue flex-shrink-0" />
            <span>Normal — sinyal prima</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-charcoal">
            <div className="w-3 h-3 rounded-full border-2 border-sfblue border-dashed flex-shrink-0" />
            <span>Scheduling-limited starvation (cincin putus-putus)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-charcoal">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#C0392B' }} />
            <span>Physical-channel starvation (perlu relokasi fisik)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-charcoal">
            <div className="w-3 h-3 rounded-full bg-charcoal/20 flex-shrink-0" />
            <span>Opacity ↓ = SINR menurun (jauh dari AP)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
