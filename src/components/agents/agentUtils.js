export function getAgentStatus(agent) {
  if (!agent.acked_at) return { label: 'Not deployed', variant: 'gray' }
  const ago = (Date.now() - new Date(agent.acked_at + 'Z').getTime()) / 1000
  if (ago < 120) return { label: 'Live', variant: 'green' }
  return { label: 'Offline', variant: 'red' }
}

export function getConfigSyncStatus(agent) {
  const rev = agent.config_revision || 0
  const acked = agent.acked_revision || 0
  if (!agent.acked_at)
    return { label: 'Not fetched', variant: 'gray', tip: 'Agent has never acknowledged a revision' }
  if (acked >= rev)
    return { label: 'Synced', variant: 'green', tip: `Agent confirmed rev ${acked}` }
  return { label: `Behind (rev ${acked})`, variant: 'yellow', tip: `Agent has rev ${acked}, latest is ${rev}` }
}

export function timeAgo(iso) {
  if (!iso) return 'Never'
  const s = Math.floor((Date.now() - new Date(iso + 'Z').getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const STATUS_CLASSES = {
  green:  'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  red:    'text-red-400 bg-red-400/10 border-red-400/20',
  yellow: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  gray:   'text-subtle bg-surface border-edge',
}

export function formatInterval(seconds) {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export function statusClasses(variant) {
  return STATUS_CLASSES[variant] ?? STATUS_CLASSES.gray
}

// ── SNMP / syslog receiver form helpers ──────────────────────────────────────

export const SNMP_SYSLOG_DEFAULTS = {
  snmp_version: '2c',
  snmp_trap_port: 162,
  syslog_port: 514,
  snmpv3_sec_level: '',
  snmpv3_sec_name: '',
  snmpv2c_credential_id: '',
  snmpv3_credential_id: '',
}

export function snmpSyslogFormFromAgent(agent) {
  return {
    snmp_version: agent.snmp_version ?? '2c',
    snmp_trap_port: agent.snmp_trap_port ?? 162,
    syslog_port: agent.syslog_port ?? 514,
    snmpv3_sec_level: agent.snmpv3_sec_level ?? '',
    snmpv3_sec_name: agent.snmpv3_sec_name ?? '',
    snmpv2c_credential_id: agent.snmpv2c_credential_id ?? '',
    snmpv3_credential_id: agent.snmpv3_credential_id ?? '',
  }
}

/** Convert form state (empty strings) to an API payload (nulls). */
export function snmpSyslogPayload(form) {
  const credId = (v) => (v !== '' && v != null ? Number(v) : null)
  return {
    snmp_version: form.snmp_version,
    snmp_trap_port: Number(form.snmp_trap_port) || 162,
    syslog_port: Number(form.syslog_port) || 514,
    snmpv3_sec_level: form.snmpv3_sec_level || null,
    snmpv3_sec_name: form.snmpv3_sec_name || null,
    snmpv2c_credential_id: credId(form.snmpv2c_credential_id),
    snmpv3_credential_id: credId(form.snmpv3_credential_id),
  }
}
