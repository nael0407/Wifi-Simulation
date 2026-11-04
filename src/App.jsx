import React, { useState, useEffect, useRef, useCallback } from 'react'
import NetworkCanvas from './components/NetworkCanvas.jsx'
import MetricDashboard from './components/MetricDashboard.jsx'
import SidebarPanel from './components/SidebarPanel.jsx'
import TimelineChart from './components/TimelineChart.jsx'
import { stepSimulation, initSimulationState, generateCSV } from './simulationEngine.js'

const DEFAULT_PARAMS = {
  K: 30,
  apCapacity: 300,
  lambdas: [1.5, 0.8, 2.0, 1.2, 0.5, 0.6],
  scheduling: 'WFQ',
  timeVarying: true,
  startHour: 8,
  bandwidth: 20,
  dMax: 30,
  pathLossExp: 3.0,
  shadowStd: 8,
  ptx: 20,
}

const TICK_MS = 200      // wall-clock ms per tick
const DELTA_MIN = 0.5    // simulated minutes per tick

export default function App() {
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [simState, setSimState] = useState(() => initSimulationState(DEFAULT_PARAMS.startHour))
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
    setSimState(initSimulationState(params.startHour))
  }

  const handleExportCSV = () => {
    if (!simState.timelineData || simState.timelineData.length === 0) {
      alert('Belum ada data telemetri yang terekam. Jalankan simulasi beberapa saat sebelum mengekspor data.')
      return
    }
    const csvContent = generateCSV(simState.timelineData)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `wifi-simulation-telemetry-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const simMinutes = Math.floor(simState.simulationTime)
  const simHours = Math.floor(simMinutes / 60)
  const simMins = simMinutes % 60

  return (
    <div className="flex flex-col h-screen bg-studio overflow-hidden">
      {/* ── Top Header Bar ── */}
      <header className="glass border-b border-border px-4 py-2.5 flex items-center justify-between flex-shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="w-8 h-8 rounded-lg bg-white hover:bg-border/60 border border-border/80 transition-colors flex items-center justify-center text-charcoal shadow-2xs flex-shrink-0"
            title="Buka / Tutup Panel Parameter"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 3h12M1 7h12M1 11h12" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sfblue flex items-center justify-center shadow-xs flex-shrink-0">
              <span className="text-white text-xs font-black">W</span>
            </div>
            <div className="truncate">
              <h1 className="text-xs font-bold text-charcoal leading-tight truncate">
                WiFi Performance Simulator
              </h1>
              <p className="text-[10px] text-muted leading-tight truncate">
                M(t)/M/K/K Loss System · Shannon Capacity · Diurnal NHPP
              </p>
            </div>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <div className="flex items-center gap-0.5 bg-border/40 rounded-lg p-0.5 border border-border/60">
            {[0.5, 1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium transition-all ${
                  speed === s ? 'bg-white text-sfblue shadow-xs font-bold' : 'text-muted hover:text-charcoal'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Start/Pause Button */}
          <button
            onClick={() => setIsRunning(r => !r)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
              isRunning
                ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                : 'bg-sfblue text-white hover:bg-blue-600'
            }`}
          >
            {isRunning ? (
              <>
                <svg width="10" height="10" fill="currentColor">
                  <rect x="0" y="0" width="3" height="10" rx="1"/>
                  <rect x="6" y="0" width="3" height="10" rx="1"/>
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 12 12">
                  <polygon points="1,0 11,6 1,12"/>
                </svg>
                {simState.simulationTime > 0 ? 'Resume' : 'Mulai'}
              </>
            )}
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-charcoal bg-white border border-border/80 hover:bg-border/40 transition-colors shadow-2xs"
            title="Reset simulasi ke kondisi awal"
          >
            Reset
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sfblue bg-blue-50/70 border border-blue-200/60 hover:bg-blue-100/70 transition-colors shadow-2xs"
            title="Unduh log data telemetri dalam format CSV"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 9v1.5a.5.5 0 00.5.5h7a.5.5 0 00.5-.5V9M6 1v7m0 0l-2.5-2.5M6 8l2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Ekspor CSV</span>
          </button>
        </div>

        {/* Current Sim Clock */}
        <div className="text-right flex-1 flex flex-col items-end min-w-0">
          <p className="text-[10px] text-muted font-medium">Durasi Simulasi</p>
          <p className="text-xs font-mono font-bold text-charcoal">
            {simHours > 0 ? `${simHours}j ` : ''}{simMins}m {Math.floor((simState.simulationTime % 1) * 60)}s
          </p>
        </div>
      </header>

      {/* ── Main Layout Body ── */}
      <div className="flex flex-1 overflow-hidden gap-3 p-3">

        {/* Left: Sidebar Panel */}
        {sidebarOpen && (
          <aside className="w-72 flex-shrink-0 glass rounded-2xl overflow-hidden flex flex-col border border-border/80 shadow-card">
            <div className="px-3.5 py-2.5 border-b border-border bg-white/50 flex items-center justify-between">
              <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">Konfigurasi Sistem</h2>
              <span className="text-[10px] font-mono text-muted bg-border/50 px-1.5 py-0.5 rounded">v2.1</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarPanel params={params} onParamsChange={setParams} />
            </div>
          </aside>
        )}

        {/* Center: Interactive Canvas & Timeline */}
        <main className="flex-1 flex flex-col gap-3 min-w-0 overflow-y-auto">
          {/* Canvas Container */}
          <div className="bg-white rounded-2xl shadow-card overflow-hidden relative border border-border/60 flex-shrink-0" style={{ height: '58vh' }}>
            {/* Top badge */}
            <div className="absolute top-3 left-3 z-10 glass rounded-xl px-3 py-1.5 border border-border/80 shadow-xs flex items-center gap-3">
              <div>
                <p className="text-[9px] text-muted font-bold uppercase tracking-wider">Live Spectrum Canvas</p>
                <p className="text-xs font-bold text-charcoal">
                  {simState.users.length} terhubung · {simState.users.filter(u => u.sinr < 10).length} degradasi RF
                </p>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="text-[10px] font-mono">
                <span className="text-muted">Kanal: </span>
                <span className="font-semibold text-sfblue">{params.bandwidth} MHz</span>
              </div>
            </div>

            <NetworkCanvas
              users={simState.users}
              params={params}
              isRunning={isRunning}
              arrivals={simState.arrivals}
              departures={simState.departures}
            />
          </div>

          {/* Bottom Timeline Charts */}
          <div className="bg-studio rounded-2xl p-2.5 flex-shrink-0 border border-border/60" style={{ height: '230px' }}>
            <TimelineChart
              data={simState.timelineData}
              currentHour={simState.currentHour}
              params={params}
            />
          </div>
        </main>

        {/* Right: Bento Metrics Dashboard */}
        <aside className="w-80 flex-shrink-0 flex flex-col gap-0 overflow-hidden">
          <div className="glass rounded-2xl overflow-hidden flex flex-col border border-border/80 shadow-card h-full">
            <div className="px-3.5 py-2.5 border-b border-border bg-white/50 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xs font-bold text-charcoal uppercase tracking-wider">Bento Telemetry</h2>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Engine
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <MetricDashboard simState={simState} params={params} />
            </div>
          </div>
        </aside>
      </div>

      {/* ── Bottom Temporal Progress Bar ── */}
      {params.timeVarying && (
        <div className="flex-shrink-0 glass border-t border-border px-5 py-2.5 flex items-center gap-4 shadow-2xs">
          <span className="text-xs text-muted font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
            <span>Waktu Simulasi:</span>
          </span>

          <div className="flex-1 relative">
            <div className="h-2 bg-border/70 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((simState.currentHour % 24) / 24) * 100}%`,
                  background: 'linear-gradient(90deg, #0071E3, #5856D6, #AF52DE)',
                }}
              />
            </div>
            {/* Hour markers */}
            <div className="flex justify-between mt-1">
              {[0, 6, 12, 18, 24].map(h => (
                <span key={h} className="text-[9px] text-muted font-mono font-medium">
                  {h.toString().padStart(2, '0')}:00
                </span>
              ))}
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-sfblue whitespace-nowrap bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/50">
            {Math.floor(simState.currentHour).toString().padStart(2, '0')}:
            {Math.floor((simState.currentHour % 1) * 60).toString().padStart(2, '0')}
          </span>

          {/* Diurnal Period Tag */}
          <span className="text-xs text-charcoal bg-white border border-border px-2.5 py-1 rounded-full font-semibold whitespace-nowrap shadow-2xs">
            {(() => {
              const h = ((simState.currentHour % 24) + 24) % 24
              if (h >= 1 && h < 6) return 'Dini Hari (01:00-06:00)'
              if (h >= 6 && h < 11) return 'Pagi (06:00-11:00)'
              if (h >= 11 && h < 14) return 'Siang Sibuk (11:00-14:00)'
              if (h >= 14 && h < 20) return 'Sore (14:00-20:00)'
              return 'Malam (20:00-01:00)'
            })()}
          </span>
        </div>
      )}
    </div>
  )
}
