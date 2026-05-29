import React from 'react'
import { CLASS_CONFIG } from '../simulationEngine.js'

function SliderRow({ label, value, min, max, step, unit, onChange, color }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-xs font-medium text-charcoal">{label}</label>
        <span
          className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded"
          style={{ color: color || '#1D1D1F', backgroundColor: color ? color + '18' : '#F5F5F7' }}
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
        className="w-full"
        style={{ accentColor: color || '#0071E3' }}
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-muted">{min}{unit}</span>
        <span className="text-[10px] text-muted">{max}{unit}</span>
      </div>
    </div>
  )
}

function SectionHeader({ title, icon }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base">{icon}</span>
      <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-border" />
}

export default function SidebarPanel({ params, onParamsChange }) {
  const update = (key, value) => onParamsChange({ ...params, [key]: value })
  const updateLambda = (i, value) => {
    const newLambdas = [...params.lambdas]
    newLambdas[i] = value
    onParamsChange({ ...params, lambdas: newLambdas })
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4">

      {/* Global AP Parameters */}
      <div className="mb-6">
        <SectionHeader title="Parameter Access Point" />
        <SliderRow label="Kapasitas AP (C)" value={params.apCapacity} min={54} max={600} step={6} unit=" Mbps" onChange={v => update('apCapacity', v)} color="#0071E3" />
        <SliderRow label="Maks. Pengguna (K)" value={params.K} min={5} max={100} step={1} unit=" usr" onChange={v => update('K', v)} color="#5856D6" />
        <SliderRow label="Jangkauan AP (d_max)" value={params.dMax} min={5} max={50} step={1} unit=" m" onChange={v => update('dMax', v)} color="#34C759" />
      </div>

      <Divider />

      {/* Channel Parameters */}
      <div className="mt-6 mb-6">
        <SectionHeader title="Parameter Kanal Shannon" />
        <SliderRow label="Bandwidth Kanal (B)" value={params.bandwidth} min={20} max={80} step={20} unit=" MHz" onChange={v => update('bandwidth', v)} color="#0071E3" />
        <SliderRow label="Daya Transmit AP (P_tx)" value={params.ptx} min={15} max={23} step={0.5} unit=" dBm" onChange={v => update('ptx', v)} color="#FF9500" />
        <SliderRow label="Path Loss Exp (n)" value={params.pathLossExp} min={2.0} max={4.5} step={0.1} unit="" onChange={v => update('pathLossExp', v)} color="#FF3B30" />
        <SliderRow label="Shadow Fading (σ)" value={params.shadowStd} min={2} max={12} step={1} unit=" dB" onChange={v => update('shadowStd', v)} color="#AF52DE" />
      </div>

      <Divider />

      {/* Scheduling Policy */}
      <div className="mt-6 mb-6">
        <SectionHeader title="Scheduling Policy" />
        <div className="flex gap-2 mb-3">
          {['BE', 'WFQ'].map(mode => (
            <button
              key={mode}
              onClick={() => update('scheduling', mode)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                params.scheduling === mode
                  ? 'bg-sfblue text-white shadow-sm'
                  : 'bg-studio text-charcoal hover:bg-border'
              }`}
            >
              {mode === 'BE' ? 'Best Effort' : 'WFQ'}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Temporal Settings */}
      <div className="mt-6 mb-6">
        <SectionHeader title="Pola Waktu Harian" />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-charcoal">Mode Time-Varying</p>
            <p className="text-[10px] text-muted">λᵢ(t) = λᵢ_base × fᵢ(t)</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={params.timeVarying}
              onChange={e => update('timeVarying', e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        <SliderRow label="Jam Mulai Simulasi" value={params.startHour} min={0} max={23} step={1} unit=":00" onChange={v => update('startHour', v)} color="#0071E3" />
      </div>

      <Divider />

      {/* Per-class Lambda */}
      <div className="mt-6">
        <SectionHeader title="Arrival Rate λᵢ (usr/menit)" />
        {CLASS_CONFIG.map((cls, i) => (
          <SliderRow
            key={cls.id}
            label={cls.name}
            value={params.lambdas[i]}
            min={0.1} max={5.0} step={0.1}
            unit=""
            onChange={v => updateLambda(i, v)}
            color={cls.color}
          />
        ))}
      </div>

    </div>
  )
}