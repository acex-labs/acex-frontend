import { SOFTWARE_PART_BY_KEY } from './compliance'

// An asset's software status: its swatch and its name, never the color alone.
export default function SoftwareStatus({ status }) {
  const part = SOFTWARE_PART_BY_KEY[status]
  if (!part) return <span className="text-content">{status}</span>
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-content">
      <span className={`inline-block w-2 h-2 rounded-full ${part.fill}`} aria-hidden="true" />
      {part.label}
    </span>
  )
}
