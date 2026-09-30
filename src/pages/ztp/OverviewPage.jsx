import { Zap } from 'lucide-react'

export default function OverviewPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b border-edge shrink-0">
        <h1 className="text-sm font-semibold text-content">ZTP — Overview</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Zap size={32} className="text-subtle mb-3" />
          <h2 className="text-sm font-medium text-content">No provisioning activity yet</h2>
          <p className="mt-1 text-xs text-subtle max-w-sm">
            Devices onboarded via Zero Touch Provisioning will show up here.
          </p>
        </div>
      </div>
    </div>
  )
}
