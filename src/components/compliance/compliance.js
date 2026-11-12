// Compliance thresholds shared by every ring and bar, for configuration and software alike.
export const complianceTone = pct =>
  pct == null ? null
  : pct >= 90 ? { stroke: 'stroke-green-400', fill: 'bg-green-400' }
  : pct >= 70 ? { stroke: 'stroke-yellow-400', fill: 'bg-yellow-400' }
  : { stroke: 'stroke-red-400', fill: 'bg-red-400' }

// Nodes or sites below this percentage count as needing attention.
export const COMPLIANCE_TARGET = 90

export const formatPct = pct => (pct == null ? '—' : `${Math.round(pct * 10) / 10}%`)

// What a node's software can be against the software policy, in the order they are drawn. The first three are
// measured; the last two are counted but left out of the percentage.
export const SOFTWARE_PARTS = [
  { key: 'golden', count: 'golden_count', label: 'Golden', fill: 'bg-cmp-good' },
  { key: 'accepted', count: 'accepted_count', label: 'Accepted', fill: 'bg-cmp-accepted' },
  { key: 'not_allowed', count: 'not_allowed_count', label: 'Not allowed', fill: 'bg-cmp-bad' },
  { key: 'unknown_version', count: 'unknown_version_count', label: 'Unknown version', fill: 'bg-cmp-unknown' },
  { key: 'no_policy', count: 'no_policy_count', label: 'No policy', fill: 'bg-cmp-unmeasured' },
]

export const softwareParts = summary => SOFTWARE_PARTS.map(p => ({ ...p, value: summary?.[p.count] ?? 0 }))

// The desired configuration components of measured nodes, split by whether the device matches them.
export const configurationParts = summary => [
  { key: 'compliant', label: 'Compliant', fill: 'bg-cmp-good', value: summary?.compliant_count ?? 0 },
  {
    key: 'deviating',
    label: 'Missing or different',
    fill: 'bg-cmp-bad',
    value: Math.max(0, (summary?.total_desired ?? 0) - (summary?.compliant_count ?? 0)),
  },
]
