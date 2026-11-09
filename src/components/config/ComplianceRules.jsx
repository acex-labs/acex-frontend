// How the compliance percentage is counted, with this diff's own numbers. Shown on hover.
const RULES = [
  'Only what the desired configuration declares is counted. Model defaults and empty sections are not.',
  'A declared component is compliant when the device has it with the same values for what it declares. Attributes left unset are not compared, so device defaults never count against it.',
  'Missing from the device, or present with other values, counts against compliance.',
  'Configuration on the device that is not declared shows as "not declared" in the diff, but does not lower the percentage.',
  'Lines the driver can not parse yet are listed as "not parsed". They show how far the driver covers the device, not compliance.',
  'References compare by what they point at, not by the name they are keyed under.',
  'With nothing declared there is nothing to be compliant with, so there is no percentage.',
]

function Count({ label, value, color = 'text-content' }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-subtle">{label}</span>
      <span className={`tabular-nums font-semibold ${color}`}>{value}</span>
    </div>
  )
}

export default function ComplianceRules({ diff }) {
  return (
    <div className="w-80 rounded-md border border-edge bg-surface-hi shadow-lg p-3 text-[11px] space-y-3">
      <div className="font-semibold text-content">How compliance is counted</div>
      <ul className="list-disc pl-4 space-y-1 text-subtle">
        {RULES.map(rule => <li key={rule}>{rule}</li>)}
      </ul>
      <div className="border-t border-edge pt-2 space-y-0.5">
        <Count label="Declared components" value={diff.total_desired ?? 0} />
        <Count label="Compliant" value={diff.compliant_count ?? 0} color="text-green-400" />
        <Count label="Missing on device" value={diff.added?.length ?? 0} color="text-yellow-400" />
        <Count label="Different" value={diff.changed?.length ?? 0} color="text-yellow-400" />
        <Count label="Not declared (not counted)" value={diff.undeclared_count ?? diff.removed?.length ?? 0} color="text-subtle" />
        <Count label="Not parsed lines (not counted)" value={diff.unparsed_count ?? 0} color="text-subtle" />
      </div>
    </div>
  )
}
