import React, { useRef, useEffect, useCallback, useState } from 'react'
import { CLASS_CONFIG } from '../simulationEngine.js'

export default function NetworkCanvas({ users, params, isRunning, arrivals = [], departures = [] }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const animFrameRef = useRef(null)
  const usersRef = useRef(users)
  const arrivalsRef = useRef(new Set())
  const departuresRef = useRef(new Set())

  const [hoveredUser, setHoveredUser] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => { usersRef.current = users }, [users])

  useEffect(() => {
    arrivals.forEach(id => {
      arrivalsRef.current.add(id)
      setTimeout(() => arrivalsRef.current.delete(id), 600)
    })
  }, [arrivals])

  useEffect(() => {
    departures.forEach(id => {
      departuresRef.current.add(id)
      setTimeout(() => departuresRef.current.delete(id), 500)
    })
  }, [departures])

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    // Ensure backing store matches high-DPI
    if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
    }

    ctx.save()
    ctx.scale(dpr, dpr)

    const W = rect.width
    const H = rect.height
    const cx = W / 2, cy = H / 2
    const R = Math.min(W, H) * 0.42

    // Background
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    // Dot grid pattern
    ctx.fillStyle = '#E5E5EA'
    for (let gx = 14; gx < W; gx += 26) {
      for (let gy = 14; gy < H; gy += 26) {
        ctx.beginPath()
        ctx.arc(gx, gy, 0.9, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Range concentric circles (25%, 50%, 75%, 100%)
    for (let ring = 1; ring <= 4; ring++) {
      const ringR = (R * ring) / 4
      ctx.beginPath()
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
      ctx.strokeStyle = ring === 4 ? '#C7C7CC' : '#E5E5EA'
      ctx.lineWidth = ring === 4 ? 1.5 : 1
      ctx.setLineDash(ring === 4 ? [] : [4, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Range distance labels
    ctx.font = '10px "JetBrains Mono", monospace'
    ctx.fillStyle = '#8E8E93'
    ctx.textAlign = 'left'
    const dMax = params.dMax
    ;[0.25, 0.5, 0.75, 1.0].forEach((frac) => {
      const dist = Math.round(frac * dMax)
      ctx.fillText(`${dist}m`, cx + R * frac + 5, cy - 4)
    })

    // AP center icon with glowing antenna radius
    const apSize = 20
    const apPulse = (Date.now() % 2400) / 2400
    ctx.beginPath()
    ctx.arc(cx, cy, apSize + apPulse * 18, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(0, 113, 227, ${0.4 * (1 - apPulse)})`
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#0071E3'
    ctx.beginPath()
    ctx.arc(cx, cy, apSize, 0, Math.PI * 2)
    ctx.fill()

    // AP label
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('AP', cx, cy)
    ctx.textBaseline = 'alphabetic'

    // Render User Nodes
    const currentUsers = usersRef.current
    const now = Date.now()

    currentUsers.forEach(user => {
      const cls = CLASS_CONFIG[user.classId] || CLASS_CONFIG[0]

      // Strict radial projection matching physical distance
      const userR = (Math.min(user.dist, params.dMax) / params.dMax) * R
      const ux = cx + userR * Math.cos(user.theta ?? 0)
      const uy = cy + userR * Math.sin(user.theta ?? 0)

      // Store computed screen coords on user object for hover hit testing
      user._screenX = ux
      user._screenY = uy

      const normalizedDist = Math.min(userR / R, 1.0)
      const opacity = Math.max(0.35, 1.0 - normalizedDist * 0.65)

      const isArriving = arrivalsRef.current.has(user.id)
      const isDeparting = departuresRef.current.has(user.id)
      const isHovered = hoveredUser && hoveredUser.id === user.id

      // Physical starvation: SINR < 10 linear (approx < 10 dB)
      const isPhysicalStarving = user.sinr < 10
      const nodeColor = isPhysicalStarving ? '#FF3B30' : cls.color

      // Scheduling starvation: throughput < 60% of average fair share
      const fairShare = params.apCapacity / Math.max(params.K, 1)
      const isSchedulingStarving = !isPhysicalStarving && user.throughput !== undefined && user.throughput < fairShare * 0.6

      // Draw scheduling starvation indicator
      if (isSchedulingStarving) {
        const pulse = (now % 1200) / 1200
        const ringR = 8 + pulse * 12
        ctx.beginPath()
        ctx.arc(ux, uy, ringR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0, 113, 227, ${(1 - pulse) * 0.7})`
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 3])
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw hover highlight halo
      if (isHovered) {
        ctx.beginPath()
        ctx.arc(ux, uy, 14, 0, Math.PI * 2)
        ctx.strokeStyle = '#0071E3'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Node soft gradient glow
      const grd = ctx.createRadialGradient(ux, uy, 0, ux, uy, 12)
      grd.addColorStop(0, nodeColor + '99')
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(ux, uy, 12, 0, Math.PI * 2)
      ctx.fill()

      // Core Node Circle
      ctx.globalAlpha = isArriving ? 1.0 : isDeparting ? 0.2 : opacity
      ctx.beginPath()
      ctx.arc(ux, uy, isHovered ? 8 : isArriving ? 7 : 5.5, 0, Math.PI * 2)
      ctx.fillStyle = nodeColor
      ctx.fill()

      // Drop shadow
      ctx.shadowColor = nodeColor
      ctx.shadowBlur = isHovered ? 8 : 4
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1.0
    })

    ctx.restore()
  }, [params, hoveredUser])

  useEffect(() => {
    const loop = () => {
      drawFrame()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [drawFrame])

  // Mouse move handler for interactive Node Inspection
  const handleMouseMove = (e) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    let closestUser = null
    let minDistance = 16 // detection radius in pixels

    for (const u of usersRef.current) {
      if (u._screenX !== undefined && u._screenY !== undefined) {
        const d = Math.hypot(u._screenX - mouseX, u._screenY - mouseY)
        if (d < minDistance) {
          minDistance = d
          closestUser = u
        }
      }
    }

    if (closestUser) {
      setHoveredUser(closestUser)
      setTooltipPos({ x: closestUser._screenX, y: closestUser._screenY })
    } else {
      setHoveredUser(null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredUser(null)
  }

  const hoveredClass = hoveredUser ? (CLASS_CONFIG[hoveredUser.classId] || CLASS_CONFIG[0]) : null

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Floating Node Telemetry Popover */}
      {hoveredUser && hoveredClass && (
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 transition-transform duration-75"
          style={{
            left: `${Math.max(130, Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 300) - 130))}px`,
            top: `${Math.max(10, tooltipPos.y - 12)}px`,
          }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-border text-xs min-w-[240px] text-charcoal">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/80">
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: hoveredClass.color }} />
                <span>{hoveredClass.name}</span>
                <span className="text-[10px] text-muted font-mono font-normal">#{hoveredUser.id}</span>
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: hoveredUser.slaSatisfied ? '#34C75920' : '#FF3B3020',
                  color: hoveredUser.slaSatisfied ? '#34C759' : '#FF3B30',
                }}
              >
                {hoveredUser.slaSatisfied ? 'SLA Met' : 'SLA Violated'}
              </span>
            </div>

            {/* Grid Metrics */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
              <span className="text-muted">Jarak AP:</span>
              <span className="font-medium text-right text-charcoal">{hoveredUser.dist} m</span>

              <span className="text-muted">Daya Terima (Prx):</span>
              <span className="font-medium text-right text-charcoal">{hoveredUser.prx} dBm</span>

              <span className="text-muted">SINR:</span>
              <span className="font-medium text-right text-charcoal">{hoveredUser.sinrDb} dB</span>

              <span className="text-muted">Kapasitas Shannon:</span>
              <span className="font-medium text-right text-sfblue">{hoveredUser.capacity} Mbps</span>

              <span className="text-muted">Jatah Scheduler:</span>
              <span className="font-medium text-right text-charcoal">{hoveredUser.bwShare} Mbps</span>

              <span className="text-muted">Throughput Aktual:</span>
              <span className="font-bold text-right" style={{ color: hoveredClass.color }}>
                {hoveredUser.throughput} Mbps
              </span>

              <span className="text-muted">Sisa Sesi:</span>
              <span className="font-medium text-right text-charcoal">
                {hoveredUser.remainingTime.toFixed(1)} min
              </span>
            </div>

            {/* Starvation Category tag */}
            <div className="mt-2 pt-1.5 border-t border-border/60 flex items-center justify-between text-[10px]">
              <span className="text-muted">Status Kanal:</span>
              <span className="font-medium">
                {hoveredUser.sinr < 10 ? (
                  <span className="text-red-500 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                    Physical Starvation
                  </span>
                ) : hoveredUser.throughput < (params.apCapacity / Math.max(params.K, 1)) * 0.6 ? (
                  <span className="text-amber-500 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full border border-sfblue border-dashed inline-block" />
                    Scheduling Limited
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Optimal Channel
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Status & Controls Info Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Legend */}
        <div className="glass rounded-xl px-3 py-1.5 border border-border/60 flex items-center gap-3 text-[11px] text-charcoal">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sfblue" />
            <span>Optimal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border border-sfblue border-dashed" />
            <span>Scheduling Starvation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Physical Starvation (&lt;10 dB)</span>
          </div>
        </div>

        {/* Hover Hint */}
        <div className="glass rounded-xl px-2.5 py-1.5 border border-border/60 text-[10px] text-muted">
          Arahkan kursor ke node untuk inspeksi individual
        </div>
      </div>

      {/* Pause Backdrop Overlay */}
      {!isRunning && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-xs rounded-xl pointer-events-none">
          <div className="text-center glass px-5 py-3 rounded-2xl border border-border/80 shadow-card">
            <div className="w-7 h-7 mx-auto mb-1.5 rounded-lg bg-border/40 flex items-center justify-center text-charcoal">
              <svg width="12" height="12" fill="currentColor">
                <rect x="1" y="1" width="3.5" height="10" rx="1"/>
                <rect x="7.5" y="1" width="3.5" height="10" rx="1"/>
              </svg>
            </div>
            <p className="text-charcoal text-xs font-semibold">Simulasi Dijeda</p>
            <p className="text-muted text-[10px]">Tekan "Resume" untuk melanjutkan iterasi waktu</p>
          </div>
        </div>
      )}
    </div>
  )
}
