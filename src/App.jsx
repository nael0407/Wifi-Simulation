import React, { useState, useEffect, useRef, useCallback } from 'react'
import NetworkCanvas from './components/NetworkCanvas.jsx'
import MetricDashboard from './components/MetricDashboard.jsx'
import SidebarPanel from './components/SidebarPanel.jsx'
import TimelineChart from './components/TimelineChart.jsx'
import { stepSimulation, initSimulationState } from './simulationEngine.js'

const DEFAULT_PARAMS = {
  K: 30,
  apCapacity: 300,
  lambdas: [1.5, 0.8, 2.0, 1.2, 0.5, 0.6],
  scheduling: 'BE',
  timeVarying: true,
  startHour: 8,
  bandwidth: 20,
  dMax: 30,
  pathLossExp: 3.0,
  shadowStd: 8,
  ptx: 20,
}

const TICK_MS = 200      // wall-clock ms per tick
const DELTA_MIN = 0.5    // simulated minutes per tick (speed)

export default function App() {
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [simState, setSimState] = useState(initSimulationState())
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const intervalRef = useRef(null)
  const paramsRef = useRef(params)

  useEffect(() => { paramsRef.current = params }, [params])

  const tick = useCallback(() => {
    setSimState(prev => stepSimulation(prev, paramsRef.current, DELTA_MIN * speed))
  }, [speed])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tick, TICK_MS)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isRunning, tick])

  const handleReset = () => {
    setIsRunning(false)
    setSimState(initSimulationState())
  }

  const simMinutes = Math.floor(simState.simulationTime)
  const simHours = Math.floor(simMinutes / 60)
  const simMins = simMinutes % 60

  return (
    <div className="flex flex-col h-screen bg-studio overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="glass border-b border-border px-5 py-3 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="w-8 h-8 rounded-lg bg-studio hover:bg-border transition-colors flex items-center justify-center text-charcoal"
            title="Toggle sidebar"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M1 3h12M1 7h12M1 11h12" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sfblue flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-charcoal leading-tight">WiFi Simulator</h1>
              <p className="text-[10px] text-muted leading-tight">M(t)/G/1/K Multi-Class · Shannon Capacity</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-studio rounded-lg p-0.5">
            {[0.5, 1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  speed === s ? 'bg-white text-sfblue shadow-sm' : 'text-muted hover:text-charcoal'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsRunning(r => !r)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isRunning
                ? 'bg-coral/10 text-coral hover:bg-coral/20'
                : 'bg-sfblue text-white hover:bg-blue-600 shadow-sm'
            }`}
          >
            {isRunning ? (
              <>
                <svg width="10" height="12" fill="currentColor">
                  <rect x="0" y="0" width="3.5" height="12" rx="1"/>
                  <rect x="6.5" y="0" width="3.5" height="12" rx="1"/>
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 12 12">
                  <polygon points="1,0 11,6 1,12"/>
                </svg>
                {simState.simulationTime > 0 ? 'Resume' : 'Mulai'}
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-charcoal hover:bg-border transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Sim Time */}
        <div className="text-right flex-1 flex flex-col items-end">
          <p className="text-xs text-muted">Waktu Simulasi</p>
          <p className="text-sm font-mono font-semibold text-charcoal">
            {simHours > 0 ? `${simHours}h ` : ''}{simMins}m {Math.floor((simState.simulationTime % 1) * 60)}s
          </p>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden gap-3 p-3">

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 flex-shrink-0 glass rounded-2xl overflow-hidden flex flex-col border border-border/60 shadow-card">
            <div className="px-4 pt-3 pb-2 border-b border-border">
              <h2 className="text-xs font-semibold text-charcoal uppercase tracking-wider">Parameter Simulasi</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarPanel params={params} onParamsChange={setParams} />
            </div>
          </aside>
        )}

        {/* Center: Canvas */}
        <main className="flex-1 flex flex-col gap-3 min-w-0 overflow-y-auto">
          {/* Canvas */}
          <div className="bg-white rounded-2xl shadow-card overflow-hidden relative border border-border/40 flex-shrink-0" style={{ height: '60vh' }}>
            <div className="absolute top-3 left-3 z-10 glass rounded-xl px-3 py-1.5 border border-border/60">
              <p className="text-[10px] text-muted font-medium uppercase tracking-wide">Live Network Canvas</p>
              <p className="text-xs font-semibold text-charcoal">
                {simState.users.length} users · {simState.users.filter(u => u.sinr < 1).length} physical starvation
              </p>
            </div>
            <NetworkCanvas
              users={simState.users}
              params={params}
              isRunning={isRunning}
              arrivals={simState.arrivals}
              departures={simState.departures}
            />
          </div>

          {/* Bottom timeline */}
          <div className="bg-studio rounded-2xl p-3 flex-shrink-0" style={{ height: '220px' }}>
            <TimelineChart
              data={simState.timelineData}
              currentHour={simState.currentHour}
              params={params}
            />
          </div>
        </main>

        {/* Right: Metrics */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-0 overflow-hidden">
          <div className="glass rounded-2xl overflow-hidden flex flex-col border border-border/60 shadow-card h-full">
            <div className="px-4 pt-3 pb-2 border-b border-border flex-shrink-0">
              <h2 className="text-xs font-semibold text-charcoal uppercase tracking-wider">Metric Bento Dashboard</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <MetricDashboard simState={simState} params={params} />
            </div>
          </div>
        </aside>
      </div>

      {/* ── Bottom temporal slider ── */}
      {params.timeVarying && (
        <div className="flex-shrink-0 glass border-t border-border px-6 py-3 flex items-center gap-4">
          <span className="text-xs text-muted font-medium uppercase tracking-wide whitespace-nowrap">
            ⏱ Waktu Simulasi Saat Ini
          </span>
          <div className="flex-1 relative">
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((simState.currentHour % 24) / 24) * 100}%`,
                  background: 'linear-gradient(90deg, #0071E3, #5856D6)'
                }}
              />
            </div>
            {/* Hour markers */}
            <div className="flex justify-between mt-1">
              {[0, 6, 12, 18, 24].map(h => (
                <span key={h} className="text-[9px] text-muted font-mono">
                  {h.toString().padStart(2, '0')}:00
                </span>
              ))}
            </div>
          </div>
          <span className="text-sm font-mono font-semibold text-sfblue whitespace-nowrap">
            {Math.floor(simState.currentHour).toString().padStart(2, '0')}:
            {Math.floor((simState.currentHour % 1) * 60).toString().padStart(2, '0')}
          </span>
          {/* Period label */}
          <span className="text-xs text-charcoal bg-blue-50 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
            {(() => {
              const h = simState.currentHour % 24
              if (h >= 1 && h < 6) return '🌙 Dini Hari'
              if (h >= 6 && h < 11) return '🌅 Pagi'
              if (h >= 11 && h < 14) return '☀️ Siang (Sibuk)'
              if (h >= 14 && h < 20) return '🌤 Sore'
              return '🌙 Malam'
            })()}
          </span>
        </div>
      )}
    </div>
  )
}