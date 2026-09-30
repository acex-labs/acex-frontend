// Node status vocabulary — mirrors NodeAdminStatus / NodeProvisionStatus in acex_devkit.

// Operator intent. Set by people.
export const ADMIN_STATUSES = ['planned', 'active', 'decommissioned']

// Provisioning lifecycle. Set by the provisioning flow, not edited by hand.
export const PROVISION_STATUSES = [
  'unprovisioned', 'adopted', 'pending', 'bootstrapping', 'provisioning', 'provisioned', 'failed',
]
