import { Handle, Position } from '@xyflow/react'

const HANDLE_INVIS = { opacity: 0, pointerEvents: 'none', width: 1, height: 1 }

function Handles() {
  return (
    <>
      <Handle type="source" position={Position.Top} style={HANDLE_INVIS} />
      <Handle type="target" position={Position.Top} style={HANDLE_INVIS} />
    </>
  )
}

const DEVICE_TONES = {
  in: {
    card:   { border: '1.5px solid color-mix(in srgb, var(--brand) 55%, transparent)', borderRadius: 10, padding: '10px 18px', minWidth: 160, boxShadow: '0 0 14px color-mix(in srgb, var(--brand) 14%, transparent)', cursor: 'pointer' },
    kicker: { color: 'var(--brand)', letterSpacing: '0.12em' },
    label:  { fontSize: 13, fontWeight: 700, color: 'var(--content)' },
  },
  out: {
    card:   { border: '1.5px solid color-mix(in srgb, var(--brand) 30%, transparent)', borderRadius: 9, padding: '9px 14px', minWidth: 145, cursor: 'pointer' },
    kicker: { color: 'color-mix(in srgb, var(--brand) 55%, transparent)', letterSpacing: '0.1em' },
    label:  { fontSize: 12, fontWeight: 600, color: 'color-mix(in srgb, var(--content) 70%, var(--subtle))' },
  },
  unmanaged: {
    card:   { border: '1.5px dashed var(--edge)', borderRadius: 9, padding: '9px 14px', minWidth: 145 },
    kicker: { color: 'var(--subtle)', letterSpacing: '0.1em' },
    label:  { fontSize: 12, fontWeight: 500, color: 'var(--subtle)' },
  },
}

const KICKER = { fontSize: 9, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }

function DeviceNode({ data }) {
  const tone = DEVICE_TONES[data.tone] ?? DEVICE_TONES.unmanaged
  return (
    <>
      <Handles />
      <div style={{ background: 'var(--surface-hi)', textAlign: 'center', ...tone.card }}>
        <div style={{ ...KICKER, ...tone.kicker }}>{data.kicker}</div>
        <div style={tone.label}>{data.label}</div>
      </div>
    </>
  )
}

function AggregateNode({ data }) {
  const inScope = data.tone === 'in'
  return (
    <>
      <Handles />
      <div style={{
        background: 'var(--surface-hi)',
        border: `1.5px solid color-mix(in srgb, var(--brand) ${inScope ? 55 : 25}%, transparent)`,
        borderRadius: 12,
        padding: '12px 20px',
        width: 200,
        textAlign: 'center',
        boxShadow: inScope ? '0 0 16px color-mix(in srgb, var(--brand) 14%, transparent)' : undefined,
        cursor: 'pointer',
      }}>
        <div style={{ ...KICKER, letterSpacing: '0.12em', color: inScope ? 'var(--brand)' : 'color-mix(in srgb, var(--brand) 55%, transparent)' }}>
          {data.kicker}{inScope ? '' : ' ↗'}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: inScope ? 'var(--content)' : 'color-mix(in srgb, var(--content) 70%, var(--subtle))' }}>
          {data.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--subtle)', marginTop: 4 }}>{data.stats}</div>
      </div>
    </>
  )
}

// The box around the devices of one site. Translucent, so links between sites show through it.
function ClusterNode({ data }) {
  const inScope = data.tone === 'in'
  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: 14,
      border: `1px ${inScope ? 'solid' : 'dashed'} color-mix(in srgb, var(--brand) ${inScope ? 35 : 20}%, transparent)`,
      background: 'color-mix(in srgb, var(--surface) 30%, transparent)',
    }}>
      <div style={{ padding: '10px 14px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: inScope ? 'var(--brand)' : 'var(--subtle)', cursor: 'pointer' }}>
        {data.label}{inScope ? '' : ' ↗'}
      </div>
    </div>
  )
}

export const NODE_TYPES = {
  device:    DeviceNode,
  aggregate: AggregateNode,
  cluster:   ClusterNode,
}
