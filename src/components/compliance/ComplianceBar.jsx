import { complianceTone } from './compliance'

// A meter from 0 to 100 %: the bar grows from the left and ends rounded at its value; an empty track when
// nothing was measured.
export default function ComplianceBar({ pct, className = '' }) {
  const tone = complianceTone(pct)
  return (
    <div className={`h-2 w-full rounded-r bg-surface-hi ${className}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}>
      {tone && pct > 0 && (
        <div className={`h-full rounded-r ${tone.fill}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      )}
    </div>
  )
}
