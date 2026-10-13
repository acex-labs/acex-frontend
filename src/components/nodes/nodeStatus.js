// Node status vocabulary — mirrors NodeAdminStatus / NodeProvisionStatus in acex_devkit.

// Operator intent. Set by people.
export const ADMIN_STATUSES = ['planned', 'active', 'decommissioned']

// Provisioning lifecycle. Set by the provisioning flow, not edited by hand.
// A node is in ZTP while enrolled, provisioning or failed.
export const PROVISION_STATUSES = ['unprovisioned', 'adopted', 'enrolled', 'provisioning', 'provisioned', 'failed']

// Statuses a node passes through on its way to `provisioned`.
export const IN_FLIGHT_STATUSES = ['enrolled', 'provisioning']

// ZTP stage of a node (ZtpStage in acex_devkit). Before provisioning starts it
// follows the asset — discovered? identity approved? — then the provision_status.
export const ZTP_PIPELINE_STAGES = ['awaiting_device', 'awaiting_approval', 'ready', 'provisioning', 'failed']
