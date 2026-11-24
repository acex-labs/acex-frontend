import { formatTimestamp } from '../config/time'
import { COLLECTION_REASONS } from './nodeStatus'

const ADMIN_STYLES = {
  planned:       'bg-surface-hi text-subtle',
  active:         'bg-green-500/10 text-green-400',
  decommissioned: 'bg-red-500/10 text-red-400',
}

const PROVISION_STYLES = {
  unprovisioned:     'bg-surface-hi text-subtle',
  adopted:           'bg-surface-hi text-content',
  enrolled:          'bg-brand/10 text-brand',
  // awaiting_device, awaiting_approval and ready are ZTP stages of an enrolled node.
  awaiting_device:   'bg-brand/10 text-brand',
  awaiting_approval: 'bg-amber-500/10 text-amber-400',
  provisioning:      'bg-brand/10 text-brand',
  provisioned:       'bg-green-500/10 text-green-400',
  failed:            'bg-red-500/10 text-red-400',
  ready:             'bg-sky-500/10 text-sky-400',
}

const BADGE_CLS = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider'

function collectionTitle({ failing_since, consecutive_failures, message }) {
  return [
    failing_since ? `Not collected since ${formatTimestamp(failing_since)}` : 'Not collected',
    consecutive_failures > 0 ? `${consecutive_failures} ${consecutive_failures === 1 ? 'attempt' : 'attempts'} in a row` : null,
    message,
  ].filter(Boolean).join(' · ')
}

// Red when the collection agents could not collect the node on their last try, with the reason as the label and the
// rest in the tooltip. A node that was collected gets a green label only when `showOk` is set, for the node's own
// page; next to its name and in lists the label is for the exception. Nothing for a node no agent has reported on.
export function CollectionBadge({ collection, showOk = false }) {
  if (showOk && collection?.status === 'ok') {
    return <span className={`${BADGE_CLS} bg-green-500/10 text-green-400`} title="Collected on the last attempt">collected</span>
  }
  if (collection?.status !== 'failing') return null
  return (
    <span className={`${BADGE_CLS} bg-red-500/10 text-red-400`} title={collectionTitle(collection)}>
      {COLLECTION_REASONS[collection.category] ?? COLLECTION_REASONS.other}
    </span>
  )
}

export function AdminStatusBadge({ status }) {
  return <span className={`${BADGE_CLS} ${ADMIN_STYLES[status] ?? 'bg-surface-hi text-subtle'}`}>{status}</span>
}

export function ProvisionStatusBadge({ status }) {
  return (
    <span className={`${BADGE_CLS} ${PROVISION_STYLES[status] ?? 'bg-surface-hi text-subtle'}`} title="Provision status">
      {status?.replaceAll('_', ' ')}
    </span>
  )
}
