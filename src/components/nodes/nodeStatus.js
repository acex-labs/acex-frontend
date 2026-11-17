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

// What the collection agents found when they last tried a node (CollectionStatus in acex_devkit). `unknown` is only a
// filter: a node no agent has reported on has no `collection` at all.
export const COLLECTION_FILTER_OPTIONS = [
  { value: 'ok', label: 'Collected' },
  { value: 'failing', label: 'Not collected' },
  { value: 'unknown', label: 'Not reported yet' },
]

// Why a node was not collected (CollectionFailure in acex_devkit), as short as a badge needs.
export const COLLECTION_REASONS = {
  unreachable:           'Unreachable',
  authentication_failed: 'Login failed',
  privilege_failed:      'Privilege level',
  ssh_algorithm:         'SSH algorithm',
  driver_unavailable:    'No driver',
  no_management_ip:      'No IP address',
  no_credentials:        'No credentials',
  empty_configuration:   'Empty config',
  other:                 'Not collected',
}
