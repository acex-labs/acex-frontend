// Chassis layout profiles for known hardware models.
//
// match(hardwareModel) is intentionally loose — no ^ anchor — so it works
// regardless of whether the asset stores "C9300-48P" or "Catalyst 9300-48P".
//
// interfaceName(portNum, unitIndex) must return the full interface name string
// that matches what appears in the ACEX configuration.
//
// layout:
//   'zigzag' — odd port numbers on top row, even on bottom (standard 48-port panel)
//   'stacked' — pairs of 2 stacked vertically, side by side (SFP uplink blocks)
//   'linear'  — single row left to right

const PROFILES = [

  // ── Cisco Catalyst 9300 ─────────────────────────────────────────────────────
  {
    id: 'c9300-48',
    match: (m) => /9300-48/i.test(m),
    label: 'Cisco Catalyst 9300 48-port',
    rackUnits: 1,
    groups: [
      {
        id: 'copper', label: 'Ethernet', portType: 'rj45',
        count: 48, layout: 'zigzag', startNum: 1,
        interfaceName: (n, u = 1) => `GigabitEthernet${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Network', portType: 'sfp+',
        count: 4, layout: 'stacked', startNum: 49, gap: true,
        interfaceName: (n, u = 1) => `TenGigabitEthernet${u}/0/${n}`,
      },
    ],
  },
  {
    id: 'c9300-24',
    match: (m) => /9300-24/i.test(m),
    label: 'Cisco Catalyst 9300 24-port',
    rackUnits: 1,
    groups: [
      {
        id: 'copper', label: 'Ethernet', portType: 'rj45',
        count: 24, layout: 'zigzag', startNum: 1,
        interfaceName: (n, u = 1) => `GigabitEthernet${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Network', portType: 'sfp+',
        count: 4, layout: 'stacked', startNum: 25, gap: true,
        interfaceName: (n, u = 1) => `TenGigabitEthernet${u}/0/${n}`,
      },
    ],
  },

  // ── Cisco Catalyst 9200 ─────────────────────────────────────────────────────
  {
    id: 'c9200-48',
    match: (m) => /9200L?-48/i.test(m),
    label: 'Cisco Catalyst 9200 48-port',
    rackUnits: 1,
    groups: [
      {
        id: 'copper', label: 'Ethernet', portType: 'rj45',
        count: 48, layout: 'zigzag', startNum: 1,
        interfaceName: (n, u = 1) => `GigabitEthernet${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Network', portType: 'sfp+',
        count: 4, layout: 'stacked', startNum: 49, gap: true,
        interfaceName: (n, u = 1) => `GigabitEthernet${u}/0/${n}`,
      },
    ],
  },
  {
    id: 'c9200-24',
    match: (m) => /9200L?-24/i.test(m),
    label: 'Cisco Catalyst 9200 24-port',
    rackUnits: 1,
    groups: [
      {
        id: 'copper', label: 'Ethernet', portType: 'rj45',
        count: 24, layout: 'zigzag', startNum: 1,
        interfaceName: (n, u = 1) => `GigabitEthernet${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Network', portType: 'sfp+',
        count: 4, layout: 'stacked', startNum: 25, gap: true,
        interfaceName: (n, u = 1) => `GigabitEthernet${u}/0/${n}`,
      },
    ],
  },

  // ── Cisco Catalyst 9500 ─────────────────────────────────────────────────────
  {
    id: 'c9500-40x',
    match: (m) => /9500-40/i.test(m),
    label: 'Cisco Catalyst 9500-40X',
    rackUnits: 1,
    groups: [
      {
        id: 'sfp+', label: 'SFP+', portType: 'sfp+',
        count: 40, layout: 'zigzag', startNum: 1,
        interfaceName: (n, u = 1) => `TenGigabitEthernet${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Uplink', portType: 'qsfp28',
        count: 2, layout: 'stacked', startNum: 1, gap: true,
        interfaceName: (n, u = 1) => `HundredGigabitEthernet${u}/0/${n}`,
      },
    ],
  },
  {
    id: 'c9500-48',
    match: (m) => /9500-48/i.test(m),
    label: 'Cisco Catalyst 9500 48-port',
    rackUnits: 1,
    groups: [
      {
        id: 'sfp+', label: 'SFP+', portType: 'sfp+',
        count: 48, layout: 'zigzag', startNum: 1,
        interfaceName: (n, u = 1) => `TenGigabitEthernet${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Uplink', portType: 'qsfp28',
        count: 8, layout: 'stacked', startNum: 1, gap: true,
        interfaceName: (n, u = 1) => `HundredGigabitEthernet${u}/0/${n}`,
      },
    ],
  },

  // ── Cisco Nexus ─────────────────────────────────────────────────────────────
  {
    id: 'nexus-93180',
    match: (m) => /93180/i.test(m),
    label: 'Cisco Nexus 93180YC-FX',
    rackUnits: 1,
    groups: [
      {
        id: 'sfp28', label: 'SFP28', portType: 'sfp+',
        count: 48, layout: 'zigzag', startNum: 1,
        interfaceName: (n) => `Ethernet1/${n}`,
      },
      {
        id: 'uplink', label: 'Uplink', portType: 'qsfp28',
        count: 6, layout: 'stacked', startNum: 49, gap: true,
        interfaceName: (n) => `Ethernet1/${n}`,
      },
    ],
  },

  // ── Juniper QFX ─────────────────────────────────────────────────────────────
  {
    id: 'qfx5120-48y',
    match: (m) => /QFX5120-48/i.test(m),
    label: 'Juniper QFX5120-48Y',
    rackUnits: 1,
    groups: [
      {
        id: 'sfp28', label: 'SFP28', portType: 'sfp+',
        count: 48, layout: 'zigzag', startNum: 0,
        interfaceName: (n, u = 0) => `et-${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Uplink', portType: 'qsfp28',
        count: 8, layout: 'stacked', startNum: 0, gap: true,
        interfaceName: (n, u = 0) => `et-${u}/0/${48 + n}`,
      },
    ],
  },
  {
    id: 'qfx5100-48s',
    match: (m) => /QFX5100-48/i.test(m),
    label: 'Juniper QFX5100-48S',
    rackUnits: 1,
    groups: [
      {
        id: 'sfp+', label: 'SFP+', portType: 'sfp+',
        count: 48, layout: 'zigzag', startNum: 0,
        interfaceName: (n, u = 0) => `xe-${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Uplink', portType: 'qsfp28',
        count: 6, layout: 'stacked', startNum: 0, gap: true,
        interfaceName: (n, u = 0) => `et-${u}/0/${48 + n}`,
      },
    ],
  },

  // ── Juniper EX ──────────────────────────────────────────────────────────────
  {
    id: 'ex4300-48t',
    match: (m) => /EX4300-48/i.test(m),
    label: 'Juniper EX4300-48T',
    rackUnits: 1,
    groups: [
      {
        id: 'copper', label: 'Ethernet', portType: 'rj45',
        count: 48, layout: 'zigzag', startNum: 0,
        interfaceName: (n, u = 0) => `ge-${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Uplink', portType: 'sfp+',
        count: 4, layout: 'stacked', startNum: 0, gap: true,
        interfaceName: (n, u = 0) => `xe-${u}/1/${n}`,
      },
    ],
  },
  {
    id: 'ex4300-24t',
    match: (m) => /EX4300-24/i.test(m),
    label: 'Juniper EX4300-24T',
    rackUnits: 1,
    groups: [
      {
        id: 'copper', label: 'Ethernet', portType: 'rj45',
        count: 24, layout: 'zigzag', startNum: 0,
        interfaceName: (n, u = 0) => `ge-${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Uplink', portType: 'sfp+',
        count: 4, layout: 'stacked', startNum: 0, gap: true,
        interfaceName: (n, u = 0) => `xe-${u}/1/${n}`,
      },
    ],
  },
  {
    id: 'ex4650-48y',
    match: (m) => /EX4650-48/i.test(m),
    label: 'Juniper EX4650-48Y',
    rackUnits: 1,
    groups: [
      {
        id: 'sfp28', label: 'SFP28', portType: 'sfp+',
        count: 48, layout: 'zigzag', startNum: 0,
        interfaceName: (n, u = 0) => `et-${u}/0/${n}`,
      },
      {
        id: 'uplink', label: 'Uplink', portType: 'qsfp28',
        count: 8, layout: 'stacked', startNum: 0, gap: true,
        interfaceName: (n, u = 0) => `et-${u}/0/${48 + n}`,
      },
    ],
  },
]

// Fallback: derive port layout from discovered interface names (config + LLDP).
// Used only when no profile matches the hardware model.
function buildFallbackProfile(ifaceNames) {
  const sorted = [...ifaceNames].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  )
  if (!sorted.length) return { id: 'fallback', label: 'Unknown', groups: [] }
  return {
    id: 'fallback',
    label: 'Unknown Model',
    groups: [
      {
        id: 'all', label: 'Ports', portType: 'rj45',
        count: sorted.length, layout: 'linear', startNum: 0,
        interfaceName: (n) => sorted[n],
      },
    ],
  }
}

export function resolveProfile(hardwareModel, fallbackIfaceNames = []) {
  const found = PROFILES.find((p) => p.match(hardwareModel ?? ''))
  return found ?? buildFallbackProfile(fallbackIfaceNames)
}
