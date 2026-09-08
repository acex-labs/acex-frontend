import { ExternalLink } from 'lucide-react'
import { NAAS_ADMIN_URL } from '../../config'

export default function AdminPage() {
  if (!NAAS_ADMIN_URL) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-subtle">
        NAAS_ADMIN_URL is not configured.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-3 border-b border-edge shrink-0 flex items-center gap-3">
        <h1 className="text-sm font-semibold text-content flex-1">Admin</h1>
        <a
          href={NAAS_ADMIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] text-subtle hover:text-brand transition-colors"
        >
          <span>Open in new tab</span>
          <ExternalLink size={11} />
        </a>
      </div>
      <div className="flex-1 min-h-0">
        <iframe
          src={NAAS_ADMIN_URL}
          title="NaaS Admin"
          className="w-full h-full border-0"
          allow="fullscreen"
        />
      </div>
    </div>
  )
}
