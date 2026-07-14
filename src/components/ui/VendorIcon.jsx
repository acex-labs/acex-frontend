import { siCisco, siJunipernetworks } from 'simple-icons'

const VENDOR_ICONS = {
  cisco:           siCisco,
  juniper:         siJunipernetworks,
  junipernetworks: siJunipernetworks,
}

const VENDOR_COLORS = {
  arista: { bg: 'bg-[#FF0000]/10', text: 'text-[#FF0000]' },
}

function normalize(vendor) {
  return vendor?.toLowerCase().replace(/[\s_-]/g, '') ?? ''
}

function InitialsBadge({ vendor, size }) {
  const key = normalize(vendor)
  const colors = VENDOR_COLORS[key] ?? { bg: 'bg-surface-hi', text: 'text-subtle' }
  const initial = vendor?.[0]?.toUpperCase() ?? '?'
  return (
    <span
      className={`inline-flex items-center justify-center rounded text-[10px] font-bold ${colors.bg} ${colors.text}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  )
}

export default function VendorIcon({ vendor, size = 16 }) {
  const icon = VENDOR_ICONS[normalize(vendor)]
  if (!icon) return <InitialsBadge vendor={vendor} size={size} />
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={`#${icon.hex}`}
      aria-label={icon.title}
      className="shrink-0"
    >
      <path d={icon.path} />
    </svg>
  )
}
