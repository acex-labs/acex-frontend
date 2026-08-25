import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDesiredConfig } from '../../api/config'
import { fetchLldpNeighbors } from '../../api/lldp'
import { resolveProfile } from './chassisProfiles'
import VendorIcon from '../ui/VendorIcon'

// ── Interface name normalization ─────────────────────────────────────────────
// Expands Cisco/Juniper abbreviations to full names so LLDP local_interface
// (e.g. "Gi1/0/1") matches configuration keys (e.g. "GigabitEthernet1/0/1").
const IFACE_EXPAND = [
  ['tengigabitethernet', 'TenGigabitEthernet'],
  ['gigabitethernet',    'GigabitEthernet'],
  ['hundredgige',        'HundredGigabitEthernet'],
  ['fastethernet',       'FastEthernet'],
  ['te',  'TenGigabitEthernet'],
  ['gi',  'GigabitEthernet'],
  ['hu',  'HundredGigabitEthernet'],
  ['fo',  'FortyGigabitEthernet'],
  ['fa',  'FastEthernet'],
  ['lo',  'Loopback'],
  ['mg',  'Management'],
  ['po',  'Port-channel'],
  ['vl',  'Vlan'],
]

function normalizeIfName(name) {
  if (!name) return ''
  const lower = name.toLowerCase()
  for (const [abbr, full] of IFACE_EXPAND) {
    if (lower.startsWith(abbr)) {
      const rest = name.slice(abbr.length)
      if (!rest || /[0-9\-\/]/.test(rest[0])) return full + rest
    }
  }
  return name
}

// ── Port mode derivation ──────────────────────────────────────────────────────
export const PORT_MODES = {
  access:       { label: 'Access',     color: '#15803d' },  // green
  trunk:        { label: 'Trunk',      color: '#b45309' },  // amber
  routed:       { label: 'Routed',     color: '#1d4ed8' },  // blue
  'lag-member': { label: 'LAG Member', color: '#7e22ce' },  // purple
  lag:          { label: 'LAG',        color: '#7e22ce' },  // purple
  management:   { label: 'Management', color: '#0e7490' },  // cyan
  shutdown:     { label: 'Shutdown',   color: '#3f3f46' },  // zinc
  unconfigured: { label: 'Has Config', color: '#44403c' },  // warm stone — has data, mode unknown
  empty:        { label: 'Unused',     color: '#111118' },  // near-black — no data at all
}

function computePortState(ifaceName, config, lldpIndex) {
  const iface = config?.interfaces?.[ifaceName]
  const lldp = lldpIndex[normalizeIfName(ifaceName)] ?? lldpIndex[ifaceName] ?? null

  if (!iface && !lldp) return { mode: 'empty', vlan: null, allowedVlans: [], description: null, ipv4: null, lldp: null }

  let mode = 'unconfigured'
  let vlan = null
  let allowedVlans = []
  let description = null
  let ipv4 = null

  if (iface) {
    description = iface.description?.value ?? null
    ipv4 = iface.ipv4?.value ?? null
    const enabled = iface.enabled?.value
    const type = iface.type
    const switchport = iface.switchport?.value
    const switchportMode = iface.switchport_mode?.value
    const lacpEnabled = iface.lacp_enabled?.value
    const aggregateId = iface.aggregate_id?.value

    if (enabled === false) {
      mode = 'shutdown'
    } else if (type === 'ieee8023adLag') {
      mode = 'lag'
    } else if (type === 'managementInterface') {
      mode = 'management'
    } else if (lacpEnabled === true || aggregateId != null) {
      mode = 'lag-member'
    } else if (ipv4 || switchport === false || type === 'softwareLoopback' || type === 'l3ipvlan') {
      mode = 'routed'
    } else if (switchportMode === 'trunk') {
      mode = 'trunk'
      allowedVlans = iface.trunk_allowed_vlans?.value ?? []
    } else if (switchportMode === 'access' || switchport === true) {
      mode = 'access'
      vlan = iface.access_vlan?.value ?? null
    }
  }

  return { mode, vlan, allowedVlans, description, ipv4, lldp }
}

// ── Port tile ─────────────────────────────────────────────────────────────────
function PortTile({ ifaceName, state, portType, onHover, onLeave }) {
  const modeInfo = PORT_MODES[state.mode] ?? PORT_MODES.empty
  const isSfp = portType === 'sfp' || portType === 'sfp+' || portType === 'qsfp28'
  const isEmpty = state.mode === 'empty'
  const hasLldp = state.lldp !== null

  return (
    <div
      role="button"
      tabIndex={0}
      className="relative cursor-default"
      onMouseEnter={(e) => onHover({ ifaceName, state, modeInfo }, e)}
      onMouseLeave={onLeave}
      style={{
        width: 'var(--pw)',
        height: isSfp ? 'var(--sh)' : 'var(--ph)',
        backgroundColor: modeInfo.color,
        borderRadius: 2,
        border: isEmpty
          ? '1px solid rgba(255,255,255,0.04)'
          : '1px solid rgba(255,255,255,0.13)',
        boxShadow: isEmpty ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.08)',
        flexShrink: 0,
        transition: 'filter 0.08s',
      }}
      onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.6)' }}
      onFocus={(e)     => { e.currentTarget.style.filter = 'brightness(1.6)' }}
      onMouseOut={(e)  => { e.currentTarget.style.filter = '' }}
      onBlur={(e)      => { e.currentTarget.style.filter = '' }}
    >
      {/* Recessed port face — only on non-empty ports */}
      {!isEmpty && (
        <div style={{
          position: 'absolute',
          top: 3, left: 3, right: 3,
          bottom: isSfp ? 3 : 7,
          backgroundColor: 'rgba(0,0,0,0.4)',
          borderRadius: 1,
        }} />
      )}
      {/* RJ45 connector notch */}
      {!isSfp && !isEmpty && (
        <div style={{
          position: 'absolute',
          bottom: 2,
          left: 5,
          right: 5,
          height: 3,
          backgroundColor: 'rgba(0,0,0,0.55)',
          borderRadius: '0 0 1px 1px',
        }} />
      )}
      {/* LLDP neighbor indicator — small dot top-right */}
      {hasLldp && (
        <div style={{
          position: 'absolute',
          top: 2,
          right: 2,
          width: 3,
          height: 3,
          borderRadius: '50%',
          backgroundColor: '#38bdf8',
          boxShadow: '0 0 3px #38bdf8',
        }} />
      )}
    </div>
  )
}

// ── Port group ────────────────────────────────────────────────────────────────
function PortGroup({ group, unitIndex, config, lldpIndex, onHover, onLeave }) {
  const { layout, count, startNum, portType, interfaceName } = group

  if (layout === 'zigzag') {
    const pairs = []
    for (let i = 0; i < count; i += 2) {
      pairs.push({ topNum: startNum + i, botNum: startNum + i + 1 })
    }
    const lastValid = startNum + count - 1

    return (
      <div className="flex flex-col">
        {/* Port rows */}
        <div className="flex gap-[2px]">
          {pairs.map(({ topNum, botNum }) => {
            const topName = interfaceName(topNum, unitIndex)
            const botName = botNum <= lastValid ? interfaceName(botNum, unitIndex) : null
            return (
              <div key={topNum} className="flex flex-col gap-[2px]">
                <PortTile
                  ifaceName={topName}
                  state={computePortState(topName, config, lldpIndex)}
                  portType={portType}
                  onHover={onHover}
                  onLeave={onLeave}
                />
                {botName
                  ? <PortTile
                      ifaceName={botName}
                      state={computePortState(botName, config, lldpIndex)}
                      portType={portType}
                      onHover={onHover}
                      onLeave={onLeave}
                    />
                  : <div style={{ width: 'var(--pw)', height: 'var(--ph)' }} />
                }
              </div>
            )
          })}
        </div>
        {/* Index labels below all ports — separate row so they don't affect port height */}
        <div className="flex gap-[2px] mt-1">
          {pairs.map(({ topNum }, ci) => (
            <div key={topNum} style={{ width: 'var(--pw)', textAlign: 'center' }}>
              {ci % 4 === 0 && (
                <span style={{ fontSize: 7, color: '#4b5563', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {topNum}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (layout === 'stacked') {
    const pairs = []
    for (let i = 0; i < count; i += 2) {
      pairs.push({ topNum: startNum + i, botNum: startNum + i + 1 })
    }
    return (
      <div className="flex gap-[2px]">
        {pairs.map(({ topNum, botNum }) => {
          const topName = interfaceName(topNum, unitIndex)
          const botName = interfaceName(botNum, unitIndex)
          return (
            <div key={topNum} className="flex flex-col gap-[2px]">
              <PortTile
                ifaceName={topName}
                state={computePortState(topName, config, lldpIndex)}
                portType={portType}
                onHover={onHover}
                onLeave={onLeave}
              />
              <PortTile
                ifaceName={botName}
                state={computePortState(botName, config, lldpIndex)}
                portType={portType}
                onHover={onHover}
                onLeave={onLeave}
              />
            </div>
          )
        })}
      </div>
    )
  }

  // linear
  return (
    <div className="flex flex-wrap gap-px">
      {Array.from({ length: count }, (_, i) => {
        const n = startNum + i
        const name = interfaceName(n, unitIndex)
        return (
          <PortTile
            key={n}
            ifaceName={name}
            state={computePortState(name, config, lldpIndex)}
            portType={portType}
            onHover={onHover}
            onLeave={onLeave}
          />
        )
      })}
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function PortTooltip({ port, x, y }) {
  if (!port) return null
  const { ifaceName, state, modeInfo } = port
  const { vlan, allowedVlans, description, ipv4, lldp } = state

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x, top: y - 6, transform: 'translate(-50%, -100%)' }}
    >
      <div
        className="rounded-md shadow-2xl px-3 py-2 min-w-[160px] max-w-[260px]"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-edge)',
        }}
      >
        {/* Port name */}
        <div className="font-mono text-[11px] text-content font-semibold mb-1.5 break-all">
          {ifaceName}
        </div>

        {/* Mode row */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: modeInfo.color }} />
          <span className="text-[11px] text-subtle">{modeInfo.label}</span>
          {vlan != null && (
            <span className="ml-auto text-[11px] font-mono text-content">VLAN {vlan}</span>
          )}
        </div>

        {/* Trunk VLANs */}
        {allowedVlans.length > 0 && (
          <div className="mt-0.5 text-[10px] text-subtle">
            VLANs: {allowedVlans.slice(0, 10).join(', ')}{allowedVlans.length > 10 ? ` +${allowedVlans.length - 10} more` : ''}
          </div>
        )}

        {/* IP */}
        {ipv4 && (
          <div className="mt-0.5 text-[10px] font-mono text-blue-400">{ipv4}</div>
        )}

        {/* Description */}
        {description && (
          <div className="mt-0.5 text-[10px] text-subtle truncate">{description}</div>
        )}

        {/* LLDP neighbor */}
        {lldp && (
          <div className="mt-1.5 pt-1.5 border-t border-edge">
            <div className="text-[10px] text-subtle mb-0.5">LLDP neighbor</div>
            <div className="text-[11px] text-content font-medium">{lldp.remote_device}</div>
            {lldp.remote_interface && (
              <div className="text-[10px] font-mono text-subtle">{lldp.remote_interface}</div>
            )}
            {lldp.discovery_protocol === 'cdp' && (
              <div className="text-[9px] text-subtle/70 mt-0.5">via CDP</div>
            )}
          </div>
        )}
      </div>

      {/* Arrow */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '100%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid #2a2a38',
      }} />
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 'calc(100% - 1px)',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderTop: '4px solid #0d0d12',
      }} />
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  const items = ['access', 'trunk', 'routed', 'lag-member', 'management', 'shutdown', 'unconfigured', 'empty']
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-4">
      {items.map((mode) => (
        <div key={mode} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PORT_MODES[mode].color, border: '1px solid rgba(255,255,255,0.10)' }} />
          <span className="text-[10px] text-subtle">{PORT_MODES[mode].label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm flex items-center justify-center" style={{ backgroundColor: PORT_MODES.access.color, border: '1px solid rgba(255,255,255,0.10)' }}>
          <span style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: '#38bdf8', display: 'block', boxShadow: '0 0 3px #38bdf8' }} />
        </span>
        <span className="text-[10px] text-subtle">LLDP neighbor</span>
      </div>
    </div>
  )
}

// Try to detect the actual unit number used in config for a profile group,
// in case the profile default doesn't match (e.g. profile uses unit 1 but config has unit 0).
function detectEffectiveUnit(group, defaultUnit, config) {
  if (!config?.interfaces) return defaultUnit
  const samples = [
    group.startNum,
    group.startNum + Math.floor(group.count * 0.25),
    group.startNum + Math.floor(group.count * 0.5),
  ]
  for (let u = 0; u <= 8; u++) {
    for (const port of samples) {
      try {
        if (config.interfaces[group.interfaceName(port, u)]) return u
      } catch { /* ignore if interfaceName throws */ }
    }
  }
  return defaultUnit
}

// ── Chassis view ──────────────────────────────────────────────────────────────
function ChassisView({ asset, unitIndex, config, lldpIndex, lldpRaw, onHover, onLeave }) {
  const panelRef = useRef(null)
  const [portWidth, setPortWidth] = useState(28)

  const configIfaceNames = Object.keys(config?.interfaces ?? {})
  const lldpIfaceNames = (lldpRaw ?? []).map((n) => normalizeIfName(n.local_interface))
  const allIfaceNames = [...new Set([...configIfaceNames, ...lldpIfaceNames])]
  const profile = resolveProfile(asset.hardware_model, allIfaceNames)

  useEffect(() => {
    const el = panelRef.current
    if (!el || !profile.groups.length) return
    const compute = () => {
      const panelW = el.getBoundingClientRect().width - 20 // subtract 10px padding each side
      let totalCols = 0
      let groupGapPx = 0
      for (const g of profile.groups) {
        totalCols += g.layout === 'linear' ? g.count : Math.ceil(g.count / 2)
        if (g.gap) groupGapPx += 12
      }
      if (!totalCols) return
      const colGapPx = Math.max(0, totalCols - 1) * 2
      const usable = panelW - colGapPx - groupGapPx - 18 // 18 = right indicator (8px) + marginLeft (10px)
      setPortWidth(Math.max(14, Math.min(60, Math.floor(usable / totalCols))))
    }
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    compute()
    return () => ro.disconnect()
  }, [profile.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const portHeight    = Math.round(portWidth * 0.93)  // RJ45: slightly less tall than wide
  const sfpHeight     = Math.round(portWidth * 0.67)  // SFP: landscape

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#0e0e14',
      border: '2px solid #252530',
      borderRadius: 8,
      padding: '10px 14px 12px',
      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.5)',
    }}>
      {/* Chassis header bar */}
      <div className="flex items-center gap-2 mb-2.5">
        <VendorIcon vendor={asset.vendor} size={13} />
        <span className="text-[11px] font-semibold" style={{ color: '#d1d5db' }}>
          {asset.hardware_model || 'Unknown model'}
        </span>
        {asset.serial_number && (
          <span className="text-[10px] font-mono ml-1" style={{ color: '#6b7280' }}>
            SN: {asset.serial_number}
          </span>
        )}
        {(asset.os || asset.os_version) && (
          <span className="ml-auto text-[10px]" style={{ color: '#6b7280' }}>
            {[asset.os, asset.os_version].filter(Boolean).join(' ')}
          </span>
        )}
        {/* Cosmetic status LEDs */}
        <div className="flex gap-1 ml-2 shrink-0">
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#16a34a' }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#166534' }} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#92400e' }} />
        </div>
      </div>

      {/* Port panel */}
      <div
        ref={panelRef}
        style={{
          backgroundColor: '#07070b',
          borderRadius: 4,
          padding: '8px 10px 10px',
          border: '1px solid #1a1a24',
          boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.6)',
        }}
      >
        {profile.groups.length === 0 ? (
          <div style={{ padding: '8px 4px', fontSize: 11, color: '#374151' }}>
            No port data — model not recognized and no configuration or LLDP data available.
          </div>
        ) : (
          <div
            className="flex items-start gap-0"
            style={{
              '--pw': portWidth + 'px',
              '--ph': portHeight + 'px',
              '--sh': sfpHeight + 'px',
            }}
          >
            {profile.groups.map((group) => {
              const effectiveUnit = detectEffectiveUnit(group, unitIndex, config)
              return (
              <div key={group.id} style={{ marginLeft: group.gap ? 12 : 0 }}>
                {group.label && (
                  <div style={{ fontSize: 7, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                    {group.label}
                  </div>
                )}
                <PortGroup
                  group={group}
                  unitIndex={effectiveUnit}
                  config={config}
                  lldpIndex={lldpIndex}
                  onHover={onHover}
                  onLeave={onLeave}
                />
              </div>
            )})}


            {/* Right-side chassis indicator block */}
            <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#134e4a', border: '1px solid #0f766e' }} />
              <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#1c1917', border: '1px solid #292524' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function HardwareTab({ nodeId, data }) {
  const [tooltip, setTooltip] = useState(null)

  const { data: config } = useQuery({
    queryKey: ['config-desired', data.logical_node_id],
    queryFn: () => fetchDesiredConfig(data.logical_node_id),
    enabled: !!data.logical_node_id,
    retry: false,
  })

  const { data: lldpRaw } = useQuery({
    queryKey: ['lldp-neighbors', nodeId],
    queryFn: () => fetchLldpNeighbors(nodeId),
    enabled: !!nodeId,
    retry: 1,
  })

  // Build index: normalized name → neighbor entry (try both raw and normalized).
  // Guard against non-array responses (e.g. paginated {items, total} shape).
  const lldpArray = Array.isArray(lldpRaw) ? lldpRaw : (lldpRaw?.items ?? [])
  const lldpIndex = {}
  for (const n of lldpArray) {
    lldpIndex[n.local_interface] = n
    lldpIndex[normalizeIfName(n.local_interface)] = n
  }

  const handleHover = useCallback((portData, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ ...portData, x: rect.left + rect.width / 2, y: rect.top })
  }, [])

  const handleLeave = useCallback(() => setTooltip(null), [])

  const asset = data.asset
  if (!asset) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-subtle">
        No asset assigned to this node.
      </div>
    )
  }

  const isCluster = asset.type === 'asset_cluster'
  const units = isCluster ? (asset.assets ?? []) : [asset]

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {units.map((unit, i) => (
          <div key={unit.id ?? i}>
            {isCluster && (
              <div className="text-[10px] font-semibold uppercase tracking-widest text-subtle mb-2">
                Unit {unit.cluster_index ?? i + 1}
              </div>
            )}
            <ChassisView
              asset={unit}
              unitIndex={unit.cluster_index ?? i + 1}
              config={config?.configuration}
              lldpIndex={lldpIndex}
              lldpRaw={lldpArray}
              onHover={handleHover}
              onLeave={handleLeave}
            />
          </div>
        ))}

        <Legend />
      </div>

      {tooltip && <PortTooltip port={tooltip} x={tooltip.x} y={tooltip.y} />}
    </div>
  )
}