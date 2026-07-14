import { useSearchParams } from 'react-router-dom'
import { BookOpen, Hammer, GitMerge } from 'lucide-react'
import DocsTab      from './DocsTab'
import BuilderTab   from './BuilderTab'
import ReconcileTab from './ReconcileTab'

const TABS = [
  {
    key:         'docs',
    label:       'Docs',
    Icon:        BookOpen,
    description: 'Browse and search all available configuration components.',
    Component:   DocsTab,
  },
  {
    key:         'builder',
    label:       'Builder',
    Icon:        Hammer,
    description: 'Compose components visually and generate a Python config map.',
    Component:   BuilderTab,
  },
  {
    key:         'reconcile',
    label:       'Reconcile',
    Icon:        GitMerge,
    description: 'Generate a config map from the delta between a device\'s running and desired config.',
    Component:   ReconcileTab,
  },
]

export default function ConfigMapsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeKey = searchParams.get('tab') ?? 'docs'
  const active = TABS.find(t => t.key === activeKey) ?? TABS[0]

  const setTab = (key) => setSearchParams({ tab: key }, { replace: true })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-edge shrink-0">
        <h1 className="text-sm font-semibold text-content">Config Maps</h1>
        <p className="text-[11px] text-subtle mt-0.5">
          Infrastructure as code — define desired network state as Python classes committed to your Git repository.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-edge px-4 shrink-0">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 -mb-px transition-colors',
              activeKey === key
                ? 'border-brand text-content'
                : 'border-transparent text-subtle hover:text-content',
            ].join(' ')}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center py-2.5 text-[11px] text-subtle/50">
          {active.description}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <active.Component />
      </div>
    </div>
  )
}
