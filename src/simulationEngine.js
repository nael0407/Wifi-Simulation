// WiFi Simulator Engine v2
// Model: M(t)/G/1/K Multi-Class Queue
// Shannon Capacity + Non-Stationary Poisson + Independent λᵢ

export const CLASS_CONFIG = [
  {
    id: 0,
    name: 'Komunikasi',
    emoji: '💬',
    color: '#0071E3',
    apps: 'WhatsApp, VoIP, Email',
    mu: 0.5,       // departure rate (1/menit)
    wfqWeight: 4,
    sensitivity: 'Latency, jitter',
    priority: 'Tinggi',
  },
  {
    id: 1,
    name: 'Pertukaran Data',
    emoji: '📁',
    color: '#34C759',
    apps: 'Google Drive, Dropbox',
    mu: 0.1,
    wfqWeight: 1,
    sensitivity: 'Throughput',
    priority: 'Rendah',
  },
  {
    id: 2,
    name: 'Akses Info',
    emoji: '🌐',
    color: '#5856D6',
    apps: 'Web browsing, berita',
    mu: 0.3,
    wfqWeight: 3,
    sensitivity: 'Page load time',
    priority: 'Sedang',
  },
  {
    id: 3,
    name: 'Hiburan',
    emoji: '🎬',
    color: '#FF9500',
    apps: 'YouTube, Netflix, Spotify',
    mu: 0.02,
    wfqWeight: 2,
    sensitivity: 'Throughput sustain',
    priority: 'Sedang',
  },
  {
    id: 4,
    name: 'Transaksi',
    emoji: '💳',
    color: '#FB8CAC',
    apps: 'Mobile banking, QRIS',
    mu: 2.0,
    wfqWeight: 5,
    sensitivity: 'Loss, latency awal',
    priority: 'Tertinggi',
  },
  {
    id: 5,
    name: 'Kolaborasi',
    emoji: '🤝',
    color: '#AF52DE',
    apps: 'Zoom, Google Meet, Miro',
    mu: 0.015,
    wfqWeight: 5,
    sensitivity: 'Latency+jitter+loss',
    priority: 'Tertinggi',
  },
]

// Temporal factors fᵢ(t) per class per time period
// periods: [dawn(01-06), morning(06-11), noon(11-14), afternoon(14-20), night(20-01)]
const TEMPORAL_FACTORS = [
  [0.3, 1.2, 1.5, 1.3, 1.0], // Komunikasi
  [0.8, 0.9, 1.3, 1.1, 1.4], // Pertukaran Data
  [0.2, 1.4, 1.8, 1.2, 0.8], // Akses Info
  [0.8, 0.6, 0.8, 1.6, 2.2], // Hiburan
  [0.2, 1.3, 1.8, 1.2, 0.6], // Transaksi
  [0.1, 1.5, 2.0, 1.2, 0.4], // Kolaborasi
]

function getTimePeriodIndex(hourOfDay) {
  if (hourOfDay >= 1 && hourOfDay < 6) return 0   // dawn
  if (hourOfDay >= 6 && hourOfDay < 11) return 1  // morning
  if (hourOfDay >= 11 && hourOfDay < 14) return 2 // noon
  if (hourOfDay >= 14 && hourOfDay < 20) return 3 // afternoon
  return 4 // night (20-01)
}

export function getTemporalFactor(classId, hourOfDay) {
  const periodIdx = getTimePeriodIndex(hourOfDay)
  return TEMPORAL_FACTORS[classId][periodIdx]
}

// Exponential random variable
function expRandom(rate) {
  return -Math.log(1 - Math.random()) / rate
}

// Normal distribution (Box-Muller)
function normalRandom(mean = 0, std = 1) {
  const u1 = Math.random(), u2 = Math.random()
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// Shannon capacity computation
export function computeShannonCapacity(dist, params) {
  const { ptx, bandwidth, pathLossExp, shadowStd, dMax } = params
  const d0 = 1.0
  const PL0 = 40.0 // dB at 1m reference

  const shadowFading = normalRandom(0, shadowStd)
  const pathLoss = PL0 + 10 * pathLossExp * Math.log10(Math.max(dist, d0)) + shadowFading
  const prx = ptx - pathLoss // dBm

  const noiseFloor = -90 // dBm
  const prxLinear = Math.pow(10, (prx - 30) / 10)  // W
  const noiseLinear = Math.pow(10, (noiseFloor - 30) / 10) // W

  const sinrLinear = prxLinear / noiseLinear
  const sinr = Math.max(sinrLinear, 0.001)

  // Shannon: B * log2(1 + SINR), B in Hz → result in Mbps
  const bHz = bandwidth * 1e6
  const capacity = (bHz * Math.log2(1 + sinr)) / 1e6 // Mbps
  return { capacity: Math.min(capacity, 600), prx, sinr }
}

// Simulation State Generator
export function stepSimulation(state, params, deltaMinutes) {
  const {
    users,
    blockedCount,
    classStats,
    simulationTime,
    timelineData,
  } = state

  const {
    K,            // max users
    apCapacity,   // total AP capacity Mbps
    lambdas,      // [6] arrival rates per class (usr/min)
    timeVarying,
    startHour,
    scheduling,   // 'BE' | 'WFQ'
    bandwidth,
    dMax,
    pathLossExp,
    shadowStd,
    ptx,
  } = params

  const currentHour = (startHour + simulationTime / 60) % 24

  // Compute effective lambdas
  const effectiveLambdas = lambdas.map((lam, i) => {
    if (!timeVarying) return lam
    return lam * getTemporalFactor(i, currentHour)
  })

  let newUsers = [...users]
  let newBlocked = blockedCount
  const newClassStats = classStats.map(s => ({ ...s }))
  const arrivals = []
  const departures = []

  // --- Process arrivals for each class ---
  for (let i = 0; i < 6; i++) {
    const lam = effectiveLambdas[i]
    // Expected arrivals in deltaMinutes
    const expectedArrivals = lam * deltaMinutes
    // Poisson sample: approximate with binomial for small delta
    const numArrivals = Math.random() < expectedArrivals - Math.floor(expectedArrivals)
      ? Math.ceil(expectedArrivals)
      : Math.floor(expectedArrivals)

    for (let a = 0; a < numArrivals; a++) {
      if (newUsers.length >= K) {
        newBlocked++
        newClassStats[i].blocked++
      } else {
        const dist = Math.random() * (dMax - 1) + 1
        const { capacity, prx, sinr } = computeShannonCapacity(dist, {
          ptx, bandwidth, pathLossExp, shadowStd, dMax
        })
        const sessionDuration = expRandom(CLASS_CONFIG[i].mu)

        const user = {
          id: Math.random().toString(36).substr(2, 9),
          classId: i,
          dist,
          capacity,     // Shannon capacity (Mbps)
          prx,          // received power dBm
          sinr,
          sessionDuration,
          remainingTime: sessionDuration,
          x: 0.5 + (Math.random() - 0.5) * 2 * (dist / dMax) * 0.85,
          y: 0.5 + (Math.random() - 0.5) * 2 * (dist / dMax) * 0.85,
          isNew: true,
        }
        newUsers.push(user)
        newClassStats[i].served++
        arrivals.push(user.id)
      }
    }
  }

  // --- Compute bandwidth allocation ---
  const wfqTotalWeight = CLASS_CONFIG.reduce((s, c) => s + c.wfqWeight, 0)
  function getBwShare(classId) {
    if (scheduling === 'WFQ') {
      const classTotal = apCapacity * (CLASS_CONFIG[classId].wfqWeight / wfqTotalWeight)
      const usersInClass = newUsers.filter(u => u.classId === classId).length
      return classTotal / Math.max(usersInClass, 1)
    }
    return apCapacity / Math.max(newUsers.length, 1)
  }

  // --- Compute per-user throughput and process departures ---
  const survivingUsers = []
  for (const user of newUsers) {
    const newRemaining = user.remainingTime - deltaMinutes
    const bwShare = getBwShare(user.classId)
    const throughput = Math.min(user.capacity, bwShare)

    if (newRemaining <= 0) {
      // Departed
      newClassStats[user.classId].totalThroughput += throughput
      newClassStats[user.classId].totalSessions += 1
      departures.push(user.id)
    } else {
      survivingUsers.push({
        ...user,
        remainingTime: newRemaining,
        throughput,
        isNew: arrivals.includes(user.id),
      })
      newClassStats[user.classId].totalThroughput += throughput * deltaMinutes
    }
  }

  // Compute total lambda
  const totalLambda = effectiveLambdas.reduce((s, l) => s + l, 0)
  const totalMu = survivingUsers.length > 0
    ? survivingUsers.reduce((s, u) => s + CLASS_CONFIG[u.classId].mu, 0) / survivingUsers.length
    : 1
  const rho = totalLambda / Math.max(totalMu, 0.001)
  const pk = rho > 0
    ? (Math.pow(rho, K) * (1 - rho)) / (1 - Math.pow(rho, K + 1))
    : 0

  const totalServed = newClassStats.reduce((s, c) => s + c.served, 0)
  const totalBlocked = newBlocked
  const blockingRate = (totalServed + totalBlocked) > 0
    ? (totalBlocked / (totalServed + totalBlocked)) * 100
    : 0


  // Update timeline
  const newTimeline = [...timelineData, {
    t: Math.round(simulationTime),
    hour: currentHour.toFixed(1),
    users: survivingUsers.length,
    blocked: newBlocked,
    blockingRate: blockingRate.toFixed(1),
    lambda: totalLambda.toFixed(2),
    rho: rho.toFixed(3),
    pk: (pk * 100).toFixed(1),
  }].slice(-200)

  return {
    users: survivingUsers,
    blockedCount: newBlocked,
    classStats: newClassStats,
    simulationTime: simulationTime + deltaMinutes,
    timelineData: newTimeline,
    currentHour,
    blockingRate: parseFloat(blockingRate.toFixed(1)),
    rho,
    pk,
    arrivals,
    departures,
  }
}

export function initSimulationState() {
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
    currentHour: 8,
    blockingRate: 0,
    rho: 0,
    pk: 0,
    arrivals: [],
    departures: [],
  }
}
