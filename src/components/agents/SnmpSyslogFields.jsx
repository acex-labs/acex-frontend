import { useQuery } from '@tanstack/react-query'
import { fetchCredentials } from '../../api/inventory'

const SNMP_VERSIONS = [
  { value: '2c',   label: 'v2c'  },
  { value: '3',    label: 'v3'   },
  { value: 'both', label: 'Both' },
]

const SEC_LEVELS = [
  { value: 'noAuthNoPriv', label: 'noAuthNoPriv' },
  { value: 'authNoPriv',   label: 'authNoPriv'   },
  { value: 'authPriv',     label: 'authPriv'     },
]

/**
 * Shared form fields for SNMP trap / syslog receiver settings.
 * `onChange(key, value)` — parent owns the form state object.
 *
 * Receiver secrets always come from mapped Credentials:
 *  - v2c → a "snmp_community" credential
 *  - v3  → a "snmpv3" credential (sec_level is chosen per agent)
 */
export default function SnmpSyslogFields({ form, onChange, hasSnmpTrap, hasSyslog }) {
  const set = (key, val) => onChange(key, val)

  const showV2c = hasSnmpTrap && (form.snmp_version === '2c' || form.snmp_version === 'both')
  const showV3 = hasSnmpTrap && (form.snmp_version === '3' || form.snmp_version === 'both')

  const { data: credData } = useQuery({
    queryKey: ['credentials', 'snmp-list'],
    queryFn: () => fetchCredentials({ limit: 1000 }),
    enabled: hasSnmpTrap,
  })
  const credList = credData?.items ?? (Array.isArray(credData) ? credData : [])
  const communityCreds = credList.filter(c => c.credential_type === 'snmp_community')
  const snmpv3Creds = credList.filter(c => c.credential_type === 'snmpv3')

  return (
    <div className="space-y-3">
      {hasSnmpTrap && (
        <>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">SNMP Version</label>
            <div className="flex gap-1">
              {SNMP_VERSIONS.map(v => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => set('snmp_version', v.value)}
                  className={[
                    'px-4 py-1.5 text-xs rounded border transition-colors',
                    form.snmp_version === v.value
                      ? 'text-content border-edge bg-surface-hi'
                      : 'text-subtle border-edge/50 hover:text-content hover:bg-surface-hi',
                  ].join(' ')}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="SNMP Trap Port" type="number" value={form.snmp_trap_port} onChange={v => set('snmp_trap_port', v)} placeholder="162" />
            {hasSyslog && (
              <Field label="Syslog Port" type="number" value={form.syslog_port} onChange={v => set('syslog_port', v)} placeholder="514" />
            )}
          </div>

          {showV2c && (
            <CredentialSelect
              label="SNMPv2c Community Credential"
              value={form.snmpv2c_credential_id}
              onChange={v => set('snmpv2c_credential_id', v)}
              credentials={communityCreds}
              emptyLabel="None (telegraf default)"
              hint="Credential of type snmp_community."
            />
          )}

          {showV3 && (
            <>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-2">Security Level</label>
                <div className="flex gap-1">
                  {SEC_LEVELS.map(l => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => set('snmpv3_sec_level', l.value)}
                      className={[
                        'px-3 py-1.5 text-xs rounded border transition-colors',
                        form.snmpv3_sec_level === l.value
                          ? 'text-content border-edge bg-surface-hi'
                          : 'text-subtle border-edge/50 hover:text-content hover:bg-surface-hi',
                      ].join(' ')}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.snmpv3_sec_level === 'noAuthNoPriv' ? (
                <Field
                  label="Security Name"
                  value={form.snmpv3_sec_name}
                  onChange={v => set('snmpv3_sec_name', v)}
                  placeholder="snmp-user"
                />
              ) : (
                form.snmpv3_sec_level && (
                  <CredentialSelect
                    label="SNMPv3 Credential"
                    value={form.snmpv3_credential_id}
                    onChange={v => set('snmpv3_credential_id', v)}
                    credentials={snmpv3Creds}
                    emptyLabel="None"
                    hint="Credential of type snmpv3 (username/auth/priv)."
                  />
                )
              )}
            </>
          )}
        </>
      )}

      {!hasSnmpTrap && hasSyslog && (
        <Field label="Syslog Port" type="number" value={form.syslog_port} onChange={v => set('syslog_port', v)} placeholder="514" />
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-7 px-2.5 text-xs rounded border border-edge bg-surface-hi text-content placeholder:text-subtle/50 focus:outline-none focus:border-brand/50 transition-colors"
      />
    </div>
  )
}

function CredentialSelect({ label, value, onChange, credentials, emptyLabel, hint }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-subtle mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-7 px-2 text-xs rounded border border-edge bg-surface-hi text-content focus:outline-none focus:border-brand/50 transition-colors"
      >
        <option value="">{emptyLabel}</option>
        {credentials.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {hint && <p className="text-[10px] text-subtle/70 mt-1">{hint}</p>}
    </div>
  )
}
