import React, { useRef, useEffect, useCallback } from 'react'
import { CLASS_CONFIG } from '../simulationEngine.js'

export default function NetworkCanvas({ users, params, isRunning, arrivals = [], departures = [] }) {
  const canvasRef = useRef(null)
  const animFrameRef = useRef(null)
  const usersRef = useRef(users)
  const arrivalsRef = useRef(new Set())
  const departuresRef = useRef(new Set())

  useEffect(() => { usersRef.current = users }, [users])

  useEffect(() => {
    arrivals.forEach(id => {
      arrivalsRef.current.add(id)
      setTimeout(() => arrivalsRef.current.delete(id), 500)
    })
  }, [arrivals])

  useEffect(() => {
    departures.forEach(id => {
      departuresRef.current.add(id)
      setTimeout(() => departuresRef.current.delete(id), 400)
    })
  }, [departures])

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const cx = W / 2, cy = H / 2
    const R = Math.min(W, H) * 0.42

    // Background
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    // Dot grid pattern
    ctx.fillStyle = '#E5E5EA'
    for (let gx = 12; gx < W; gx += 24) {
      for (let gy = 12; gy < H; gy += 24) {
        ctx.beginPath()
        ctx.arc(gx, gy, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Range circles (d25%, d50%, d75%, d100%)
    for (let ring = 1; ring <= 4; ring++) {
      const ringR = R * ring / 4
      ctx.beginPath()
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
      ctx.strokeStyle = ring === 4 ? '#C7C7CC' : '#E5E5EA'
      ctx.lineWidth = ring === 4 ? 1.5 : 1
      ctx.setLineDash(ring === 4 ? [] : [4, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Range labels
    ctx.font = '10px "JetBrains Mono", monospace'
    ctx.fillStyle = '#C7C7CC'
    ctx.textAlign = 'left'
    const dMax = params.dMax
    ;[0.25, 0.5, 0.75, 1.0].forEach((frac, i) => {
      const dist = Math.round(frac * dMax)
      ctx.fillText(`${dist}m`, cx + R * frac + 4, cy - 4)
    })

    // AP icon at center
    const apSize = 22
    ctx.fillStyle = '#0071E3'
    ctx.beginPath()
    ctx.arc(cx, cy, apSize, 0, Math.PI * 2)
    ctx.fill()

    // Tulisan AP di tengah
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('AP', cx, cy)
    ctx.textBaseline = 'alphabetic'

    // Users
    const currentUsers = usersRef.current
    currentUsers.forEach(user => {
      const cls = CLASS_CONFIG[user.classId]
      const ux = cx + (user.x - 0.5) * R * 2
      const uy = cy + (user.y - 0.5) * R * 2

      // Opacity based on actual visual distance from AP center
      const visualDist = Math.sqrt((ux - cx) ** 2 + (uy - cy) ** 2)
      const normalizedDist = Math.min(visualDist / R, 1.0)
      const opacity = Math.max(0.25, 1.0 - normalizedDist * 0.75)

      const isArriving = arrivalsRef.current.has(user.id)
      const isDeparting = departuresRef.current.has(user.id)

      // Physical starvation: SINR < 10 linear (~10 dB) = sinyal buruk di tepi jangkauan
      const isPhysicalStarving = user.sinr < 10
      const nodeColor = isPhysicalStarving ? '#C0392B' : cls.color

      // Scheduling starvation: throughput < 30% dari jatah rata-rata per user
      const fairShare = params.apCapacity / Math.max(params.K, 1)
      const isStarving = !isPhysicalStarving && user.throughput !== undefined && user.throughput < fairShare * 0.6
      if (isStarving && !isPhysicalStarving) {
        const pulse = (Date.now() % 1200) / 1200
        const ringOpacity = (1 - pulse) * 0.6
        const ringR = 7 + pulse * 14
        ctx.beginPath()
        ctx.arc(ux, uy, ringR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0, 113, 227, ${ringOpacity})`
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 3])
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Node glow
      const grd = ctx.createRadialGradient(ux, uy, 0, ux, uy, 10)
      grd.addColorStop(0, nodeColor + Math.round(opacity * 80).toString(16).padStart(2, '0'))
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(ux, uy, 10, 0, Math.PI * 2)
      ctx.fill()

      // Main circle
      ctx.globalAlpha = isArriving ? 0.9 : isDeparting ? 0.3 : opacity
      ctx.beginPath()
      ctx.arc(ux, uy, isArriving ? 8 : 6, 0, Math.PI * 2)
      ctx.fillStyle = nodeColor
      ctx.fill()

      // Soft drop shadow
      ctx.shadowColor = nodeColor
      ctx.shadowBlur = 4
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    })

    // Legend bottom
    const legendY = H - 14
    ctx.font = '10px Inter, sans-serif'
    ctx.textAlign = 'left'

    const legendItems = [
      { color: '#0071E3', label: 'Aktif' },
      { color: '#C0392B', label: 'Physical Starvation' },
    ]
    let lx = 12
    legendItems.forEach(({ color, label }) => {
      ctx.beginPath()
      ctx.arc(lx + 5, legendY, 4, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.fillStyle = '#86868B'
      ctx.fillText(label, lx + 13, legendY + 4)
      lx += ctx.measureText(label).width + 28
    })
  }, [params])

  useEffect(() => {
    const loop = () => {
      drawFrame()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [drawFrame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
      {!isRunning && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
          <div className="text-center">
            <div className="text-4xl mb-2">⏸</div>
            <p className="text-muted text-sm font-medium">Simulasi dijeda</p>
          </div>
        </div>
      )}
    </div>
  )
}