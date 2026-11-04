import React from 'react'
import { CLASS_CONFIG } from '../simulationEngine.js'

export const SCENARIO_PRESETS = [
  {
    id: 'balanced',
    name: 'Standar Seimbang',
    badge: 'Rekomendasi',
    desc: 'Distribusi normal multi-kelas dengan scheduling WFQ aktif.',
    params: {
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
    },
  },
  {
    id: 'heavy-download',
    name: 'Lonjakan Bulk Download',
    badge: 'Uji Starvation',
    desc: 'Data transfer masif pada Best Effort memicu degradasi video/VoIP.',
    params: {
      K: 30,
      apCapacity: 300,
      lambdas: [1.0, 4.5, 1.2, 0.8, 0.4, 0.6],
      scheduling: 'BE',
      timeVarying: false,
      startHour: 10,
      bandwidth: 20,
      dMax: 30,
      pathLossExp: 3.0,
      shadowStd: 8,
      ptx: 20,
    },
  },
  {
    id: 'collab-rush',
    name: 'Jam Sibuk Video Call',
    badge: 'Siang 11:00',
    desc: 'Puncak Zoom/Meet siang hari; WFQ melindungi latency & jitter.',
    params: {
      K: 35,
      apCapacity: 350,
      lambdas: [2.0, 0.5, 1.5, 0.6, 1.2, 3.2],
      scheduling: 'WFQ',
      timeVarying: true,
      startHour: 11,
      bandwidth: 40,
      dMax: 25,
      pathLossExp: 2.8,
      shadowStd: 6,
      ptx: 21,
    },
  },
  {
    id: 'shadowing-blankspot',
    name: 'Dinding Tebal & Blankspot',
    badge: 'Physical Loss',
    desc: 'Redaman tinggi (n=3.8, σ=11 dB) memicu Physical Starvation.',
    params: {
      K: 30,
      apCapacity: 300,
      lambdas: [1.5, 0.8, 2.0, 1.2, 0.5, 0.6],
      scheduling: 'WFQ',
      timeVarying: true,
      startHour: 14,
      bandwidth: 20,
      dMax: 45,
      pathLossExp: 3.8,
      shadowStd: 11,
      ptx: 18,
    },
  },
  {
    id: 'night-streaming',
    name: 'Hiburan Malam Hari',
    badge: 'Malam 21:00',
    desc: 'Didominasi video streaming & musik (YouTube/Netflix/Spotify).',
    params: {
      K: 30,
      apCapacity: 250,
      lambdas: [0.8, 1.2, 0.6, 3.8, 0.2, 0.2],
      scheduling: 'WFQ',
      timeVarying: true,
      startHour: 21,
      bandwidth: 20,
      dMax: 30,
      pathLossExp: 3.0,
      shadowStd: 8,
      ptx: 20,
    },
  },
]

function SliderRow({ label, value, min, max, step, unit, onChange, color }) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-center mb-1">
        <label className="text-[11px] font-medium text-charcoal">{label}</label>
        <span
          className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded"
          style={{ color: color || '#1D1D1F', backgroundColor: color ? color + '15' : '#F5F5F7' }}
        >
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer h-1.5 bg-border rounded-lg appearance-none"
        style={{ accentColor: color || '#0071E3' }}
      />
      <div className="flex justify-between mt-0.5 text-[9px] text-muted font-mono">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-1.5 mb-2.5">
      <span className="w-1.5 h-1.5 rounded-full bg-sfblue" />
      <h3 className="text-[11px] font-bold text-charcoal uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-border/80 my-3.5" />
}

export default function SidebarPanel({ params, onParamsChange }) {
  const update = (key, value) => onParamsChange({ ...params, [key]: value })
  const updateLambda = (i, value) => {
    const newLambdas = [...params.lambdas]
    newLambdas[i] = value
    onParamsChange({ ...params, lambdas: newLambdas })
  }

  const applyPreset = (preset) => {
    onParamsChange({ ...params, ...preset.params })
  }

  return (
    <div className="h-full overflow-y-auto px-3.5 py-3">

      {/* Preset Scenarios */}
      <div className="mb-2">
        <SectionHeader title="Preset Skenario Cepat" />
        <div className="space-y-1.5">
          {SCENARIO_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="w-full text-left p-2 rounded-xl bg-white hover:bg-blue-50/60 border border-border/70 hover:border-sfblue/40 transition-all text-xs group shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-charcoal group-hover:text-sfblue text-[11px]">
                  {p.name}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-border/40 text-muted group-hover:bg-blue-100 group-hover:text-sfblue">
                  {p.badge}
                </span>
              </div>
              <p className="text-[10px] text-muted mt-0.5 line-clamp-1 leading-snug">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Scheduling Policy */}
      <div>
        <SectionHeader title="Kebijakan Penjadwalan" />
        <div className="flex gap-2 mb-2">
          {['BE', 'WFQ'].map(mode => (
            <button
              key={mode}
              onClick={() => update('scheduling', mode)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                params.scheduling === mode
                  ? 'bg-sfblue text-white shadow-sm'
                  : 'bg-white text-charcoal border border-border hover:bg-border/40'
              }`}
            >
              {mode === 'BE' ? 'Best Effort' : 'WFQ (QoS)'}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted leading-tight">
          {params.scheduling === 'WFQ'
            ? 'WFQ mengisolasi & melindungi kelas prioritas tinggi dari kelaparan.'
            : 'Best Effort membagi rata spektrum tanpa bobot prioritas aplikasi.'}
        </p>
      </div>

      <Divider />

      {/* Global AP Parameters */}
      <div>
        <SectionHeader title="Kapasitas Access Point" />
        <SliderRow label="Kapasitas AP (C)" value={params.apCapacity} min={54} max={600} step={6} unit=" Mbps" onChange={v => update('apCapacity', v)} color="#0071E3" />
        <SliderRow label="Batas Antrian (K)" value={params.K} min={5} max={80} step={1} unit=" usr" onChange={v => update('K', v)} color="#5856D6" />
        <SliderRow label="Radius Sel (d_max)" value={params.dMax} min={10} max={60} step={1} unit=" m" onChange={v => update('dMax', v)} color="#34C759" />
      </div>

      <Divider />

      {/* Channel Parameters */}
      <div>
        <SectionHeader title="Fisika Kanal & Fading" />
        <SliderRow label="Bandwidth Kanal (B)" value={params.bandwidth} min={20} max={80} step={20} unit=" MHz" onChange={v => update('bandwidth', v)} color="#0071E3" />
        <SliderRow label="Daya Pancar AP (P_tx)" value={params.ptx} min={15} max={25} step={0.5} unit=" dBm" onChange={v => update('ptx', v)} color="#FF9500" />
        <SliderRow label="Path Loss Exponent (n)" value={params.pathLossExp} min={2.0} max={4.5} step={0.1} unit="" onChange={v => update('pathLossExp', v)} color="#FF3B30" />
        <SliderRow label="Shadow Fading Std (σ)" value={params.shadowStd} min={2} max={14} step={1} unit=" dB" onChange={v => update('shadowStd', v)} color="#AF52DE" />
      </div>

      <Divider />

      {/* Temporal Settings */}
      <div>
        <SectionHeader title="Siklus Waktu Harian" />
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-medium text-charcoal">Mode Waktu Harian (NHPP)</p>
            <p className="text-[10px] text-muted">λᵢ(t) = λᵢ_base × fᵢ(t)</p>
          </div>
          <input
            type="checkbox"
            checked={params.timeVarying}
            onChange={e => update('timeVarying', e.target.checked)}
            className="w-4 h-4 text-sfblue rounded border-border focus:ring-0 cursor-pointer"
          />
        </div>
        <SliderRow label="Jam Mulai Simulasi" value={params.startHour} min={0} max={23} step={1} unit=":00" onChange={v => update('startHour', v)} color="#0071E3" />
      </div>

      <Divider />

      {/* Per-class Lambda */}
      <div>
        <SectionHeader title="Arrival Rate Base λᵢ (usr/m)" />
        {CLASS_CONFIG.map((cls, i) => (
          <SliderRow
            key={cls.id}
            label={cls.name}
            value={params.lambdas[i]}
            min={0.1} max={6.0} step={0.1}
            unit=""
            onChange={v => updateLambda(i, v)}
            color={cls.color}
          />
        ))}
      </div>

    </div>
  )
}
