// Node status vocabulary — mirrors NodeAdminStatus / NodeProvisionStatus in acex_devkit.

// Operator intent. Set by people.
export const ADMIN_STATUSES = ['planned', 'active', 'decommissioned']

// Provisioning lifecycle. Set by the provisioning flow, not edited by hand.
// Each stage names who is being waited on.
export const PROVISION_STATUSES = [
  'unprovisioned', 'adopted', 'awaiting_device', 'bootstrapping', 'awaiting_approval',
  'provisioning', 'provisioned', 'failed',
]

// Provisioning stages a device passes through on its way to `provisioned`.
export const IN_FLIGHT_STATUSES = ['awaiting_device', 'bootstrapping', 'awaiting_approval', 'provisioning']
