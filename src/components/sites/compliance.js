// Compliance thresholds shared by the site's rings and bars, matching the node configuration tab.
export const complianceTone = pct =>
  pct == null ? null
  : pct >= 90 ? { stroke: 'stroke-green-400', fill: 'bg-green-400' }
  : pct >= 70 ? { stroke: 'stroke-yellow-400', fill: 'bg-yellow-400' }
  : { stroke: 'stroke-red-400', fill: 'bg-red-400' }

// Nodes below this percentage count as needing attention.
export const COMPLIANCE_TARGET = 90
