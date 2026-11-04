import React from 'react'
import { CLASS_CONFIG } from '../simulationEngine.js'

function KpiCard({ label, value, unit, sub, accent }) {
  return (
    <div className="bento-card bg-white rounded-xl p-3 shadow-card border border-border/40">
      <p className="text-[10px] text-muted font-medium uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span
          className="text-base font-bold font-mono leading-tight"
          style={{ color: accent || '#1D1D1F' }}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-muted font-medium">{unit}</span>}
      </div>
      {sub && <p className="text-[10px] text-muted mt-0.5 leading-snug">{sub}</p>}
    </div>
  )
}

export default function MetricDashboard({ simState, params }) {
  const {
    users,
    blockedCount,
    classStats,
    blockingRate,
    rho,
    pk,
    avgLatency = 8.0,
    slaCompliance = 100,
    slaViolations = 0,
  } = simState

  const classThroughputs = classStats.map((st, i) => {
    const activeUsers = users.filter(u => u.classId === i)
    const avgThroughput = activeUsers.length > 0
      ? activeUsers.reduce((s, u) => s + (u.throughput || 0), 0) / activeUsers.length
      : 0
    const violatedCount = activeUsers.filter(u => !u.slaSatisfied).length
    return {
      ...CLASS_CONFIG[i],
      avgThroughput,
      count: activeUsers.length,
      blocked: st.blocked,
      violatedCount,
    }
  })

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-0.5">
      {/* KPI Grid (6 metrics) */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard
          label="Active Users"
          value={users.length}
          unit={`/ ${params.K}`}
          sub={`${((users.length / Math.max(params.K, 1)) * 100).toFixed(0)}% kapasitas`}
          accent="#0071E3"
        />
        <KpiCard
          label="Blocking Rate"
          value={blockingRate.toFixed(1)}
          unit="%"
          sub={`${blockedCount} total rejected`}
          accent={blockingRate > 10 ? '#FF3B30' : blockingRate > 5 ? '#FF9500' : '#34C759'}
        />
        <KpiCard
          label="Traffic Load ρ"
          value={rho.toFixed(3)}
          unit=""
          sub={rho >= 1 ? 'Jenuh (ρ ≥ 1)' : rho > 0.7 ? 'Beban Tinggi' : 'Kondisi Stabil'}
          accent={rho >= 1 ? '#FF3B30' : rho > 0.7 ? '#FF9500' : '#34C759'}
        />
        <KpiCard
          label="Erlang-B B(K, A)"
          value={`${pk > 0 ? (pk * 100).toFixed(2) : '0.00'}`}
          unit="%"
          sub="Prob. Rugi M/M/K/K"
          accent="#5856D6"
        />
        <KpiCard
          label="SLA Compliance"
          value={`${slaCompliance.toFixed(0)}%`}
          unit=""
          sub={slaViolations > 0 ? `${slaViolations} di bawah SLA` : 'Semua target terpenuhi'}
          accent={slaCompliance < 80 ? '#FF3B30' : slaCompliance < 95 ? '#FF9500' : '#34C759'}
        />
        <KpiCard
          label="Est. RTT Latency"
          value={avgLatency.toFixed(0)}
          unit="ms"
          sub={avgLatency > 50 ? 'Antrian delay tinggi' : 'Latensi normal'}
          accent={avgLatency > 60 ? '#FF3B30' : avgLatency > 30 ? '#FF9500' : '#0071E3'}
        />
      </div>

      {/* Per-class throughput distribution */}
      <div className="bento-card bg-white rounded-xl p-3 shadow-card border border-border/40">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-muted font-medium uppercase tracking-wide">
            Throughput per Kelas
          </p>
          <span className="text-[10px] text-muted font-mono">Target SLA</span>
        </div>
        <div className="space-y-2.5">
          {classThroughputs.map((cls) => {
            const maxTp = Math.max(...classThroughputs.map(c => c.avgThroughput), 20)
            const barWidth = Math.min((cls.avgThroughput / maxTp) * 100, 100)
            const isUnderSLA = cls.count > 0 && cls.avgThroughput < cls.minBandwidth

            return (
              <div key={cls.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-charcoal flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
                    <span>{cls.name}</span>
                    <span className="text-muted font-normal font-mono text-[10px]">({cls.count})</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {cls.count > 0 && (
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: isUnderSLA ? '#FF3B30' : cls.color }}
                      >
                        {cls.avgThroughput.toFixed(1)} Mbps
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-muted bg-border/50 px-1 rounded">
                      ≥{cls.minBandwidth}M
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: isUnderSLA ? '#FF3B30' : cls.color,
                    }}
                  />
                </div>

                {/* Sub status indicators */}
                <div className="flex justify-between items-center mt-0.5 text-[9px]">
                  <span>
                    {isUnderSLA && (
                      <span className="text-red-500 font-semibold">Under-SLA ({cls.violatedCount} usr)</span>
                    )}
                  </span>
                  <span>
                    {cls.blocked > 0 && (
                      <span className="text-amber-500">{cls.blocked} rejected</span>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Scheduling policy info */}
      <div className="bento-card bg-white rounded-xl p-3 shadow-card border border-border/40">
        <p className="text-[10px] text-muted font-medium uppercase tracking-wide">Scheduling Policy</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs font-semibold text-charcoal">
            {params.scheduling === 'WFQ' ? 'Weighted Fair Queueing' : 'Best Effort (Equal Share)'}
          </p>
          <span className="text-[10px] font-mono bg-blue-50 text-sfblue px-2 py-0.5 rounded-full font-medium">
            {params.scheduling === 'WFQ' ? 'Work-Conserving GPS' : 'C / N_total'}
          </span>
        </div>
        <p className="text-[10px] text-muted mt-1 leading-snug">
          {params.scheduling === 'WFQ'
            ? 'Bobot diprioritaskan untuk Transaksi (5) & Kolaborasi (5). Sisa kapasitas diredistribusikan.'
            : 'Semua kelas berbagi porsi bandwidth sama tanpa memperhitungkan sensitivitas aplikasi.'}
        </p>
      </div>
    </div>
  )
}
