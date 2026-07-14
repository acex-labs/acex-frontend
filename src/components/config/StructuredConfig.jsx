import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

function extractVal(v) {
  if (v === null || v === undefined) return null
  if (typeof v !== 'object') return v
  if ('pointer' in v) return `→ ${v.pointer}`
  if ('value' in v) return v.value
  return v
}

function isEmpty(v) {
  if (v === null || v === undefined) return true
  if (typeof v === 'object' && !Array.isArray(v)) {
    if ('pointer' in v) return false
    if ('value' in v) return v.value === null || v.value === undefined
    return Object.keys(v).every(k => isEmpty(v[k]))
  }
  if (Array.isArray(v)) return v.length === 0
  return false
}

function ValueRow({ label, value }) {
  const display = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
  const isRef = typeof display === 'string' && display.startsWith('→')
  return (
    <div className="flex gap-4 py-1.5 border-b border-edge/40 last:border-0 text-xs">
      <span className="w-40 shrink-0 text-subtle text-[11px]">{label}</span>
      <span className={isRef ? 'text-brand/80 font-mono text-[11px]' : 'text-content'}>{display}</span>
    </div>
  )
}

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-edge rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-surface-hi hover:bg-surface-hi/80 transition-colors"
      >
        <ChevronRight
          size={12}
          className={`text-subtle transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-subtle">{title}</span>
      </button>
      {open && <div className="px-3 py-2">{children}</div>}
    </div>
  )
}

function renderObject(obj, depth = 0) {
  if (isEmpty(obj)) return null
  const entries = Object.entries(obj).filter(([, v]) => !isEmpty(v))
  return entries.map(([key, val]) => {
    const extracted = extractVal(val)
    if (extracted === null) return null
    if (typeof extracted !== 'object') {
      return <ValueRow key={key} label={key} value={extracted} />
    }
    if (typeof extracted === 'string') {
      return <ValueRow key={key} label={key} value={extracted} />
    }
    const children = renderObject(extracted, depth + 1)
    if (!children) return null
    if (depth >= 2) {
      return (
        <div key={key} className="ml-2 pl-2 border-l border-edge/40 mb-1">
          <span className="text-[10px] text-subtle uppercase tracking-wider block mb-1">{key}</span>
          {children}
        </div>
      )
    }
    return <Section key={key} title={key}>{children}</Section>
  }).filter(Boolean)
}

function DictSection({ title, dict }) {
  const entries = Object.entries(dict ?? {})
  if (!entries.length) return null
  return (
    <Section title={title}>
      {entries.map(([key, val]) => {
        const children = renderObject(val, 1)
        if (!children) return null
        return (
          <Section key={key} title={key} defaultOpen={entries.length === 1}>
            {children}
          </Section>
        )
      })}
    </Section>
  )
}

export default function StructuredConfig({ config, isLoading }) {
  if (isLoading) return <div className="p-6 text-xs text-subtle animate-pulse">Loading…</div>
  if (!config)   return <div className="p-6 text-xs text-subtle">No configuration available.</div>

  const cfg = config.configuration ?? config

  return (
    <div className="p-4 space-y-2 overflow-auto h-full">
      {/* System scalar fields */}
      {!isEmpty(cfg.system?.config) && (
        <Section title="System" defaultOpen>
          {renderObject(cfg.system.config, 1)}
        </Section>
      )}

      {!isEmpty(cfg.system?.ssh) && (
        <Section title="SSH">
          {renderObject(cfg.system.ssh, 1)}
        </Section>
      )}

      {!isEmpty(cfg.system?.ntp?.servers) && (
        <DictSection title="NTP Servers" dict={cfg.system.ntp.servers} />
      )}

      {!isEmpty(cfg.system?.logging) && (
        <Section title="Logging">
          {renderObject(cfg.system.logging, 1)}
        </Section>
      )}

      {!isEmpty(cfg.system?.aaa) && (
        <Section title="AAA">
          {renderObject(cfg.system.aaa, 1)}
        </Section>
      )}

      {!isEmpty(cfg.system?.snmp) && (
        <Section title="SNMP">
          {renderObject(cfg.system.snmp, 1)}
        </Section>
      )}

      {!isEmpty(cfg.interfaces) && (
        <DictSection title="Interfaces" dict={cfg.interfaces} />
      )}

      {!isEmpty(cfg.network_instances) && (
        <DictSection title="Network Instances" dict={cfg.network_instances} />
      )}

      {!isEmpty(cfg.stp) && (
        <Section title="STP">
          {renderObject(cfg.stp, 1)}
        </Section>
      )}

      {!isEmpty(cfg.lldp) && (
        <Section title="LLDP">
          {renderObject(cfg.lldp, 1)}
        </Section>
      )}

      {!isEmpty(cfg.cdp) && (
        <Section title="CDP">
          {renderObject(cfg.cdp, 1)}
        </Section>
      )}

      {!isEmpty(cfg.lacp) && (
        <Section title="LACP">
          {renderObject(cfg.lacp, 1)}
        </Section>
      )}
    </div>
  )
}
