import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ArrowLeft, AlertTriangle } from 'lucide-react'
import { claimAsset } from '../../api/ztp'
import VendorIcon from '../ui/VendorIcon'
import LogicalNodePicker from './LogicalNodePicker'

// Claims one approved asset, by the discovery that approved it: pick the logical node it
// becomes, then confirm. onClaimed gets the id of the node the claim enrolled.
export default function ClaimPanel({ discovery, onClaimed, onClose }) {
  const queryClient = useQueryClient()
  const [site, setSite] = useState('')
  const [target, setTarget] = useState(null)

  const asset = {
    id: discovery.asset_id,
    serial_number: discovery.serial_number,
    vendor: discovery.vendor,
    hardware_model: discovery.hardware_model,
  }

  const mutation = useMutation({
    mutationFn: () => claimAsset({ asset, logicalNode: target }),
    onSuccess: node => {
      ['ztp', 'nodes', 'assets', 'logical-nodes'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }))
      onClaimed(node.node_id)
    },
  })
  const busy = mutation.isPending

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-edge">
        <div className="flex items-center gap-2">
          <VendorIcon vendor={discovery.vendor} size={13} />
          <span className="text-sm font-semibold text-heading font-mono truncate">{discovery.serial_number}</span>
          <button onClick={onClose} className="ml-auto text-subtle hover:text-content" title="Close"><X size={13} /></button>
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-subtle">
          <span>{[discovery.vendor, discovery.hardware_model].filter(Boolean).join(' ') || '—'}</span>
          <span className="font-mono">{discovery.source_ip}</span>
        </div>
      </div>

      {target ? (
        <div className="px-4 py-3 space-y-3">
          <div className="text-xs text-content">
            Claim <span className="font-mono">{discovery.serial_number}</span> as{' '}
            <span className="font-medium">{target.hostname}</span>
            <div className="text-[11px] text-subtle">{[target.site, target.role].filter(Boolean).join(' · ') || '—'}</div>
          </div>
          {target.assigned && (
            <p className="flex items-center gap-1 text-[11px] text-amber-400">
              <AlertTriangle size={11} />
              Replaces the device in service. The node will need to be provisioned again.
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTarget(null); mutation.reset() }}
              disabled={busy}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-subtle hover:text-content hover:bg-surface-hi rounded transition-colors"
            >
              <ArrowLeft size={11} />Back
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={busy}
              className={[
                'ml-auto px-4 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 text-white',
                target.assigned ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand hover:bg-brand/90',
              ].join(' ')}
            >
              {busy ? 'Claiming…' : target.assigned ? 'Replace device' : 'Claim'}
            </button>
          </div>
          {mutation.isError && (
            <p className="text-[11px] text-red-400">
              {typeof mutation.error.detail === 'string' ? mutation.error.detail : mutation.error.message}
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <LogicalNodePicker asset={asset} siteFilter={site} onSiteFilterChange={setSite} onPick={setTarget} />
        </div>
      )}
    </div>
  )
}
