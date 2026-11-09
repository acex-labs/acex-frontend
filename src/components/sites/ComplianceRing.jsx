import { complianceTone } from './compliance'

// A ring that fills to a compliance percentage, with the figure in its center.

const STROKE = { sm: 4, lg: 10 }
const FIGURE = { sm: 'text-[10px]', lg: 'text-2xl' }

export default function ComplianceRing({ pct, size = 44, variant = 'sm', loading = false }) {
  const stroke = STROKE[variant]
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const filled = pct == null ? 0 : Math.min(Math.max(pct, 0), 100) / 100 * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={stroke}
          className={`stroke-surface-hi ${loading ? 'animate-pulse' : ''}`}
        />
        {filled > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            className={`${complianceTone(pct).stroke} transition-[stroke-dasharray] duration-500`}
          />
        )}
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-semibold tabular-nums ${FIGURE[variant]} ${pct == null ? 'text-subtle' : 'text-content'}`}>
        {loading ? '' : pct == null ? '—' : `${Math.round(pct)}%`}
      </div>
    </div>
  )
}
