import { unparsedRows } from './unparsed'

export default function UnparsedLines({ unmatched }) {
  return (
    <div className="font-mono text-[11px] leading-5 overflow-x-auto">
      {unparsedRows(unmatched).map((row, i) => (
        <div key={i} className={['whitespace-pre', row.context ? 'text-subtle/50' : 'text-amber-300'].join(' ')}>
          {row.text || ' '}
        </div>
      ))}
    </div>
  )
}
