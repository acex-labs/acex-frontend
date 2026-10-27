import { useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import NodePicker from '../../components/operations/NodePicker'
import ExecCommands from './ExecCommands'
import StandardActions from './StandardActions'

// The kinds of bulk action, each run on nodes you choose and listed with its runs.
const SECTIONS = [
  {
    key: 'exec',
    label: 'Exec Commands',
    about: 'Raw, vendor-specific commands, sent as written. Output is masked before it is stored.',
    Panel: ExecCommands,
  },
  {
    key: 'standard',
    label: 'Standard Actions',
    about: 'Vendor-agnostic methods: the same parameters and the same result on every device, whatever its driver. Ping for now; more will follow.',
    Panel: StandardActions,
  },
]

export default function BulkActionsPage() {
  const { section } = useParams()
  // One picker and one choice of nodes for every kind of action, kept when switching between them.
  const [selected, setSelected] = useState(new Map())
  const current = SECTIONS.find(s => s.key === section)
  if (!current) return <Navigate to={`/operations/bulk-actions/${SECTIONS[0].key}`} replace />

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-edge px-4 shrink-0">
        {SECTIONS.map(({ key, label }) => (
          <NavLink
            key={key}
            to={`/operations/bulk-actions/${key}`}
            className={({ isActive }) => [
              'px-3 py-2 text-xs border-b-2 -mb-px transition-colors',
              isActive ? 'border-brand text-content' : 'border-transparent text-subtle hover:text-content',
            ].join(' ')}
          >
            {label}
          </NavLink>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <p className="text-[11px] text-subtle">{current.about}</p>
        <NodePicker selected={selected} onChange={setSelected} />
        <current.Panel key={current.key} selected={selected} />
      </div>
    </div>
  )
}
