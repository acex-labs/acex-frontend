const ADMIN_STYLES = {
  planned:        'bg-surface-hi text-subtle',
  active:         'bg-green-500/10 text-green-400',
  decommissioned: 'bg-red-500/10 text-red-400',
}

const PROVISION_STYLES = {
  unprovisioned: 'bg-surface-hi text-subtle',
  adopted:       'bg-surface-hi text-content',
  pending:       'bg-amber-500/10 text-amber-400',
  bootstrapping: 'bg-brand/10 text-brand',
  provisioning:  'bg-brand/10 text-brand',
  provisioned:   'bg-green-500/10 text-green-400',
  failed:        'bg-red-500/10 text-red-400',
}

const BADGE_CLS = 'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider'

export function AdminStatusBadge({ status }) {
  return <span className={`${BADGE_CLS} ${ADMIN_STYLES[status] ?? 'bg-surface-hi text-subtle'}`}>{status}</span>
}

export function ProvisionStatusBadge({ status }) {
  return (
    <span className={`${BADGE_CLS} ${PROVISION_STYLES[status] ?? 'bg-surface-hi text-subtle'}`} title="Provision status">
      {status}
    </span>
  )
}
