import { useState } from 'react'
import SnmpSyslogFields from './SnmpSyslogFields'
import { snmpSyslogFormFromAgent, snmpSyslogPayload } from './agentUtils'

export default function SnmpSyslogSettingsPanel({ agent, onSave }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(() => snmpSyslogFormFromAgent(agent))

  const capabilities = agent.capabilities ?? []
  const hasSnmpTrap = capabilities.includes('snmp_trap')
  const hasSyslog = capabilities.includes('syslog_rfc5424')

  const handleEdit = () => {
    setForm(snmpSyslogFormFromAgent(agent))
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(snmpSyslogPayload(form))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end mb-3">
        {!editing ? (
          <button
            onClick={handleEdit}
            className="text-xs text-subtle hover:text-content transition-colors px-2 py-1 rounded hover:bg-surface-hi"
          >
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-subtle hover:text-content transition-colors px-2 py-1 rounded hover:bg-surface-hi"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs text-brand hover:text-brand/80 transition-colors px-2 py-1 rounded hover:bg-brand/10 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        <div className="space-y-1.5">
          {hasSnmpTrap && (
            <div className="px-3 py-2 rounded-lg bg-surface-hi border border-edge">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-content">SNMP Trap</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded text-brand bg-brand/10">
                  {agent.snmp_version ?? '2c'}
                </span>
              </div>
              <span className="text-[11px] text-subtle">
                udp://:{agent.snmp_trap_port ?? 162}
                {(agent.snmp_version === '2c' || agent.snmp_version === 'both') && agent.snmpv2c_credential_id != null &&
                  ' · v2c cred'}
                {(agent.snmp_version === '3' || agent.snmp_version === 'both') && agent.snmpv3_sec_level &&
                  ` · ${agent.snmpv3_sec_level}`}
                {(agent.snmp_version === '3' || agent.snmp_version === 'both') && agent.snmpv3_credential_id != null &&
                  ' · v3 cred'}
                {(agent.snmp_version === '3' || agent.snmp_version === 'both') && agent.snmpv3_sec_name &&
                  ` · ${agent.snmpv3_sec_name}`}
              </span>
            </div>
          )}
          {hasSyslog && (
            <div className="px-3 py-2 rounded-lg bg-surface-hi border border-edge">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-content">Syslog</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded text-brand bg-brand/10">
                  RFC5424
                </span>
              </div>
              <span className="text-[11px] text-subtle">udp://:{agent.syslog_port ?? 514}</span>
            </div>
          )}
        </div>
      ) : (
        <SnmpSyslogFields
          form={form}
          onChange={(key, val) => setForm(p => ({ ...p, [key]: val }))}
          hasSnmpTrap={hasSnmpTrap}
          hasSyslog={hasSyslog}
        />
      )}
    </>
  )
}
