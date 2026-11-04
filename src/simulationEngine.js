// WiFi Simulator Engine v2.1
// Model: M(t)/G/1/K Multi-Class Non-Stationary Queue
// Shannon-Hartley Capacity + Non-Homogeneous Poisson Process (NHPP) + Work-Conserving WFQ

export const CLASS_CONFIG = [
  {
    id: 0,
    name: 'Komunikasi',
    color: '#0071E3',
    apps: 'WhatsApp, VoIP, Email',
    mu: 0.5,             // departure rate (1/menit) -> mean duration 2.0 min
    wfqWeight: 4,
    minBandwidth: 0.3,   // Mbps minimum SLA target
    sensitivity: 'Latency, jitter',
    priority: 'Tinggi',
  },
  {
    id: 1,
    name: 'Pertukaran Data',
    color: '#34C759',
    apps: 'Google Drive, Dropbox',
    mu: 0.1,             // departure rate -> mean duration 10.0 min
    wfqWeight: 1,
    minBandwidth: 8.0,   // Mbps minimum SLA target
    sensitivity: 'Throughput',
    priority: 'Rendah',
  },
  {
    id: 2,
    name: 'Akses Info',
    color: '#5856D6',
    apps: 'Web browsing, berita',
    mu: 0.3,             // departure rate -> mean duration 3.3 min
    wfqWeight: 3,
    minBandwidth: 1.0,   // Mbps minimum SLA target
    sensitivity: 'Page load time',
    priority: 'Sedang',
  },
  {
    id: 3,
    name: 'Hiburan',
    color: '#FF9500',
    apps: 'YouTube, Netflix, Spotify',
    mu: 0.02,            // departure rate -> mean duration 50.0 min
    wfqWeight: 2,
    minBandwidth: 3.0,   // Mbps minimum SLA target
    sensitivity: 'Throughput sustain',
    priority: 'Sedang',
  },
  {
    id: 4,
    name: 'Transaksi',
    color: '#FB8CAC',
    apps: 'Mobile banking, QRIS',
    mu: 2.0,             // departure rate -> mean duration 0.5 min
    wfqWeight: 5,
    minBandwidth: 0.2,   // Mbps minimum SLA target
    sensitivity: 'Loss, latency awal',
    priority: 'Tertinggi',
  },
  {
    id: 5,
    name: 'Kolaborasi',
    color: '#AF52DE',
    apps: 'Zoom, Google Meet, Miro',
    mu: 0.015,           // departure rate -> mean duration 66.7 min
    wfqWeight: 5,
    minBandwidth: 3.0,   // Mbps minimum SLA target
    sensitivity: 'Latency, jitter, loss',
    priority: 'Tertinggi',
  },
]

// Temporal factors fᵢ(t) per class per time period
// Periods: [dawn(01-06), morning(06-11), noon(11-14), afternoon(14-20), night(20-01)]
const TEMPORAL_FACTORS = [
  [0.3, 1.2, 1.5, 1.3, 1.0], // Komunikasi
  [0.8, 0.9, 1.3, 1.1, 1.4], // Pertukaran Data
  [0.2, 1.4, 1.8, 1.2, 0.8], // Akses Info
  [0.8, 0.6, 0.8, 1.6, 2.2], // Hiburan
  [0.2, 1.3, 1.8, 1.2, 0.6], // Transaksi
  [0.1, 1.5, 2.0, 1.2, 0.4], // Kolaborasi
]

export function getTimePeriodIndex(hourOfDay) {
  const h = ((hourOfDay % 24) + 24) % 24
  if (h >= 1 && h < 6) return 0   // dawn (01-06)
  if (h >= 6 && h < 11) return 1  // morning (06-11)
  if (h >= 11 && h < 14) return 2 // noon (11-14)
  if (h >= 14 && h < 20) return 3 // afternoon (14-20)
  return 4                        // night (20-01)
}

export function getTemporalFactor(classId, hourOfDay) {
  const periodIdx = getTimePeriodIndex(hourOfDay)
  return TEMPORAL_FACTORS[classId][periodIdx]
}

// Exponential random variable generator (session duration)
export function expRandom(rate) {
  return -Math.log(Math.max(1e-9, 1 - Math.random())) / Math.max(rate, 1e-6)
}

// Normal distribution via Box-Muller transform (shadow fading)
export function normalRandom(mean = 0, std = 1) {
  const u1 = Math.max(1e-9, Math.random())
  const u2 = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// True Poisson random variable generator
// Knuth's algorithm for lambda < 30, Gaussian approximation for larger lambda
export function samplePoisson(lambda) {
  if (lambda <= 0) return 0
  if (lambda > 30) {
    return Math.max(0, Math.round(normalRandom(lambda, Math.sqrt(lambda))))
  }
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}

// Shannon-Hartley capacity computation
export function computeShannonCapacity(dist, params) {
  const { ptx, bandwidth, pathLossExp, shadowStd } = params
  const d0 = 1.0
  const PL0 = 40.0 // dB at 1m reference distance

  const shadowFading = normalRandom(0, shadowStd)
  const pathLoss = PL0 + 10 * pathLossExp * Math.log10(Math.max(dist, d0)) + shadowFading
  const prx = ptx - pathLoss // received power in dBm

  const noiseFloor = -90.0 // dBm thermal noise floor
  const sinrDb = prx - noiseFloor
  const sinrLinear = Math.pow(10, sinrDb / 10)
  const sinr = Math.max(sinrLinear, 0.001)

  // Shannon: C = B * log2(1 + SINR) (B in MHz -> result in Mbps)
  const capacity = bandwidth * Math.log2(1 + sinr)
  return {
    capacity: Math.min(capacity, 600),
    prx: parseFloat(prx.toFixed(1)),
    sinr,
    sinrDb: parseFloat(sinrDb.toFixed(1)),
  }
}

// Simulation Engine Step Function
export function stepSimulation(state, params, deltaMinutes) {
  const {
    users,
    blockedCount,
    classStats,
    simulationTime,
    timelineData,
  } = state

  const {
    K,            // buffer capacity (max concurrent associations)
    apCapacity,   // total AP capacity (Mbps)
    lambdas,      // [6] base arrival rates (users/min)
    timeVarying,
    startHour,
    scheduling,   // 'BE' | 'WFQ'
    bandwidth,
    dMax,
    pathLossExp,
    shadowStd,
    ptx,
  } = params

  const currentHour = ((startHour + simulationTime / 60) % 24 + 24) % 24

  // Compute effective arrival rates with NHPP temporal factors
  const effectiveLambdas = lambdas.map((lam, i) => {
    if (!timeVarying) return lam
    return lam * getTemporalFactor(i, currentHour)
  })

  let newUsers = [...users]
  let newBlocked = blockedCount
  const newClassStats = classStats.map(s => ({ ...s }))
  const arrivals = []
  const departures = []

  // --- 1. Process Arrivals via True Poisson Process ---
  for (let i = 0; i < 6; i++) {
    const lam = effectiveLambdas[i]
    const expectedArrivals = lam * deltaMinutes
    const numArrivals = samplePoisson(expectedArrivals)

    for (let a = 0; a < numArrivals; a++) {
      if (newUsers.length >= K) {
        newBlocked++
        newClassStats[i].blocked++
      } else {
        const dist = Math.random() * (dMax - 1) + 1
        const { capacity, prx, sinr, sinrDb } = computeShannonCapacity(dist, {
          ptx, bandwidth, pathLossExp, shadowStd, dMax
        })
        const sessionDuration = Math.max(0.1, expRandom(CLASS_CONFIG[i].mu))

        // Uniform polar angle mapping for consistent spatial representation
        const theta = Math.random() * 2 * Math.PI
        const visualR = (dist / dMax) * 0.42

        const user = {
          id: Math.random().toString(36).substring(2, 9),
          classId: i,
          dist: parseFloat(dist.toFixed(1)),
          capacity: parseFloat(capacity.toFixed(2)),
          prx,
          sinr,
          sinrDb,
          sessionDuration,
          remainingTime: sessionDuration,
          theta,
          x: 0.5 + visualR * Math.cos(theta),
          y: 0.5 + visualR * Math.sin(theta),
          isNew: true,
          throughput: 0,
          slaSatisfied: true,
        }
        newUsers.push(user)
        newClassStats[i].served++
        arrivals.push(user.id)
      }
    }
  }

  // --- 2. Work-Conserving Bandwidth Scheduling ---
  // Count active users per class
  const activeClassCounts = [0, 1, 2, 3, 4, 5].map(
    cid => newUsers.filter(u => u.classId === cid).length
  )

  // Work-conserving WFQ: active weight is the sum of weights of classes with >= 1 active user
  const activeClassesWeight = CLASS_CONFIG.reduce((sum, cls) => {
    return activeClassCounts[cls.id] > 0 ? sum + cls.wfqWeight : sum
  }, 0)

  function getBwShare(classId) {
    if (newUsers.length === 0) return 0
    if (scheduling === 'WFQ') {
      if (activeClassesWeight === 0) return 0
      const classTotal = apCapacity * (CLASS_CONFIG[classId].wfqWeight / activeClassesWeight)
      const usersInClass = activeClassCounts[classId]
      return classTotal / Math.max(usersInClass, 1)
    }
    // Best Effort (Equal Share across all active users)
    return apCapacity / Math.max(newUsers.length, 1)
  }

  // --- 3. Throughput Allocation, SLA Evaluation & Departures ---
  const survivingUsers = []
  for (const user of newUsers) {
    const newRemaining = user.remainingTime - deltaMinutes
    const bwShare = getBwShare(user.classId)
    // Actual throughput is bounded by Shannon channel capacity
    const throughput = Math.min(user.capacity, bwShare)
    const slaSatisfied = throughput >= CLASS_CONFIG[user.classId].minBandwidth

    if (newRemaining <= 0) {
      // User session finished
      newClassStats[user.classId].totalThroughput += throughput * deltaMinutes
      newClassStats[user.classId].totalSessions += 1
      departures.push(user.id)
    } else {
      survivingUsers.push({
        ...user,
        remainingTime: newRemaining,
        throughput: parseFloat(throughput.toFixed(2)),
        bwShare: parseFloat(bwShare.toFixed(2)),
        slaSatisfied,
        isNew: arrivals.includes(user.id),
      })
      newClassStats[user.classId].totalThroughput += throughput * deltaMinutes
    }
  }

  // --- 4. Mathematical Queueing Indicators ---
  // Offered load in Erlangs: sum(lambda_i / mu_i)
  const offeredLoad = effectiveLambdas.reduce((sum, lam, i) => {
    return sum + lam / Math.max(CLASS_CONFIG[i].mu, 0.001)
  }, 0)

  // System traffic intensity normalized to AP capacity K: rho = offeredLoad / K
  const rho = offeredLoad / Math.max(K, 1)

  const totalLambda = effectiveLambdas.reduce((s, l) => s + l, 0)

  // Erlang-B blocking probability with L'Hopital limit at rho = 1
  let pk = 0
  if (rho > 0) {
    if (Math.abs(rho - 1.0) < 1e-4) {
      pk = 1 / (K + 1)
    } else {
      const rhoPowK = Math.pow(rho, K)
      if (!isFinite(rhoPowK) || rhoPowK > 1e12) {
        pk = (rho - 1) / rho
      } else {
        pk = (rhoPowK * (1 - rho)) / (1 - rhoPowK * rho)
      }
    }
  }
  pk = Math.max(0, Math.min(1, pk))

  // Empirical rejection rate
  const totalServed = newClassStats.reduce((s, c) => s + c.served, 0)
  const totalBlocked = newBlocked
  const blockingRate = (totalServed + totalBlocked) > 0
    ? (totalBlocked / (totalServed + totalBlocked)) * 100
    : 0

  // Estimated average network contention latency (ms)
  const baseLatency = 8.0 // baseline unloaded RTT ms
  const contentionDelay = (survivingUsers.length / Math.max(K, 1)) * 30.0 * Math.min(rho, 2.0)
  const avgLatency = baseLatency + contentionDelay

  // SLA violation count
  const slaViolations = survivingUsers.filter(u => !u.slaSatisfied).length
  const slaCompliance = survivingUsers.length > 0
    ? ((survivingUsers.length - slaViolations) / survivingUsers.length) * 100
    : 100

  // Update timeline history
  const newTimeline = [...timelineData, {
    t: Math.round(simulationTime),
    hour: currentHour.toFixed(1),
    users: survivingUsers.length,
    blocked: newBlocked,
    blockingRate: parseFloat(blockingRate.toFixed(1)),
    lambda: parseFloat(totalLambda.toFixed(2)),
    rho: parseFloat(rho.toFixed(3)),
    pk: parseFloat((pk * 100).toFixed(2)),
    latency: parseFloat(avgLatency.toFixed(1)),
    slaCompliance: parseFloat(slaCompliance.toFixed(1)),
  }].slice(-200)

  return {
    users: survivingUsers,
    blockedCount: newBlocked,
    classStats: newClassStats,
    simulationTime: simulationTime + deltaMinutes,
    timelineData: newTimeline,
    currentHour,
    blockingRate: parseFloat(blockingRate.toFixed(1)),
    rho: parseFloat(rho.toFixed(3)),
    pk,
    avgLatency: parseFloat(avgLatency.toFixed(1)),
    slaCompliance: parseFloat(slaCompliance.toFixed(1)),
    slaViolations,
    arrivals,
    departures,
  }
}

export function initSimulationState(startHour = 8) {
  return {
    users: [],
    blockedCount: 0,
    simulationTime: 0,
    classStats: CLASS_CONFIG.map(() => ({
      served: 0,
      blocked: 0,
      totalThroughput: 0,
      totalSessions: 0,
    })),
    timelineData: [],
    currentHour: startHour,
    blockingRate: 0,
    rho: 0,
    pk: 0,
    avgLatency: 8.0,
    slaCompliance: 100,
    slaViolations: 0,
    arrivals: [],
    departures: [],
  }
}

// CSV Exporter for Telemetry & Research Logs
export function generateCSV(timelineData) {
  if (!timelineData || timelineData.length === 0) return ''
  const headers = ['Time_min', 'Hour_OfDay', 'Active_Users', 'Total_Blocked', 'Blocking_Rate_Pct', 'Lambda_Total', 'Rho_Traffic_Intensity', 'Erlang_B_Pk_Pct', 'Avg_Latency_ms', 'SLA_Compliance_Pct']
  const rows = timelineData.map(d => [
    d.t,
    d.hour,
    d.users,
    d.blocked,
    d.blockingRate,
    d.lambda,
    d.rho,
    d.pk,
    d.latency ?? '',
    d.slaCompliance ?? '',
  ].join(','))
  return [headers.join(','), ...rows].join('\n')
}
