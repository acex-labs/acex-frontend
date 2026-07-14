import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Network, MapPin, Globe, Cloud, Server, Wrench,
  Upload, Sparkles, History, Activity, BarChart3,
  Radio, HardDriveDownload, KeyRound, BookUser, Info,
  FileCode2, Plug, GitBranch, ListChecks, Zap, CalendarClock,
  Eye, Bot, Settings, ChevronDown, Menu, PanelLeftClose,
  LogOut, UserCircle, Package, TerminalSquare,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

const SECTIONS = [
  {
    items: [
      { to: '/', text: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Network',
    icon: Network,
    items: [
      { to: '/network/nodes', text: 'Nodes', icon: Server },
      { to: '/network/sites', text: 'Sites', icon: MapPin },
      { to: '/network/regions', text: 'Regions', icon: Globe },
      { to: '/network/logical-nodes', text: 'Logical Nodes', icon: Cloud },
      { to: '/network/assets', text: 'Assets', icon: Package },
      { to: '/network/contacts', text: 'Contacts', icon: BookUser },
      { to: '/network/import', text: 'Import', icon: Upload },
    ],
  },
  {
    label: 'Configs',
    icon: FileCode2,
    items: [
      { to: '/configs/config-maps', text: 'Config Maps', icon: FileCode2 },
      { to: '/configs/translator', text: 'Translator', icon: TerminalSquare },
      { to: '/configs/neds', text: 'NEDs', icon: Wrench },
      // { to: '/configs/drivers', text: 'Drivers', icon: Plug },
    ],
  },
  {
    label: 'Operations',
    icon: Zap,
    items: [
      { to: '/operations/workflows', text: 'Workflows', icon: GitBranch },
      { to: '/operations/bulk-actions', text: 'Bulk Actions', icon: ListChecks },
      { to: '/operations/triggers', text: 'Triggers', icon: Zap },
      { to: '/operations/scheduled', text: 'Scheduled', icon: CalendarClock },
    ],
  },
  {
    label: 'Observe',
    icon: Eye,
    items: [
      { to: '/observe/icmp', text: 'ICMP', icon: Activity },
      { to: '/observe/telemetry', text: 'Telemetry', icon: Radio },
      { to: '/observe/dashboards', text: 'Dashboards', icon: BarChart3 },
      { to: '/observe/config-history', text: 'Config History', icon: History },
    ],
  },
  {
    label: 'Autopilot',
    icon: Bot,
    items: [
      { to: '/autopilot/ai-ops', text: 'AI Ops', icon: Sparkles },
      { to: '/autopilot/agents', text: 'Agents', icon: Bot },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    items: [
      { to: '/settings/credentials', text: 'Credentials', icon: KeyRound },
      { to: '/settings/telemetry-agents', text: 'Telemetry Agents', icon: Radio },
      { to: '/settings/collection-agents', text: 'Collection Agents', icon: HardDriveDownload },
      { to: '/settings/about', text: 'About', icon: Info },
    ],
  },
]

function NavItem({ to, text, icon: Icon, end, collapsed }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? text : undefined}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 w-full py-1 text-xs rounded transition-colors duration-150',
          collapsed ? 'justify-center px-0' : 'pl-5 pr-2',
          isActive
            ? 'text-brand bg-brand/10'
            : 'text-subtle hover:text-content hover:bg-surface-hi',
        ].join(' ')
      }
    >
      <Icon size={13} className="shrink-0" />
      {!collapsed && <span>{text}</span>}
    </NavLink>
  )
}

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const username = user?.profile?.preferred_username || user?.profile?.email || ''

  const findActiveSection = () =>
    SECTIONS.find(s =>
      s.label && s.items.some(item =>
        item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
      )
    )?.label ?? null

  const activeSection = findActiveSection()

  const [open, setOpen] = useState(() => {
    const initial = {}
    SECTIONS.forEach(s => { if (s.label) initial[s.label] = false })
    if (activeSection) initial[activeSection] = true
    return initial
  })

  useEffect(() => {
    if (activeSection) {
      setOpen(prev => prev[activeSection] ? prev : { ...prev, [activeSection]: true })
    }
  }, [location.pathname, activeSection])

  const toggle = label => setOpen(prev => ({ ...prev, [label]: !prev[label] }))

  return (
    <aside
      className={[
        'flex flex-col h-full bg-surface border-r border-edge shrink-0 overflow-hidden',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-14' : 'w-56',
      ].join(' ')}
    >
      {/* Logo */}
      <div className={['flex items-center justify-center pt-4 pb-3', collapsed ? 'px-2' : 'px-4'].join(' ')}>
        <img
          src="/acex_mokey_round.png"
          alt="ACEX"
          className={['transition-all duration-200', collapsed ? 'w-7 h-7' : 'w-20 h-20'].join(' ')}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-px">
        {SECTIONS.map((section, i) => {
          const isExpandable = !!section.label
          const isOpen = !isExpandable || collapsed || open[section.label]
          const SectionIcon = section.icon

          return (
            <div key={i}>
              {isExpandable && !collapsed && (
                <button
                  onClick={() => toggle(section.label)}
                  className="flex items-center justify-between w-full px-2 py-1 mt-2 text-[10px] font-semibold uppercase tracking-widest text-subtle hover:text-content rounded transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <SectionIcon size={10} />
                    <span>{section.label}</span>
                  </div>
                  <ChevronDown
                    size={10}
                    className={['transition-transform duration-200', isOpen ? '' : '-rotate-90'].join(' ')}
                  />
                </button>
              )}

              {isExpandable && collapsed && (
                <div className="border-t border-edge mx-1 my-2" />
              )}

              <div
                className="overflow-hidden transition-all duration-200 ease-in-out"
                style={{ maxHeight: isOpen ? '600px' : '0' }}
              >
                <div className="space-y-0.5 pt-0.5">
                  {section.items.map(item => (
                    <NavItem key={item.to} {...item} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-edge px-2 py-2">
        <div className={['flex items-center gap-2', collapsed ? 'flex-col' : 'px-1'].join(' ')}>
          <UserCircle size={13} className="text-subtle shrink-0" />
          {!collapsed && (
            <span className="text-[11px] text-subtle truncate flex-1">{username}</span>
          )}
          <button
            onClick={logout}
            title="Logout"
            className="text-subtle hover:text-brand transition-colors p-0.5 rounded"
          >
            <LogOut size={12} />
          </button>
        </div>
      </div>

      {/* Collapse toggle */}
      <div className="px-2 pb-3">
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="flex items-center justify-center w-full py-1 text-subtle hover:text-content hover:bg-surface-hi rounded transition-colors"
        >
          {collapsed ? <Menu size={13} /> : <PanelLeftClose size={13} />}
        </button>
      </div>
    </aside>
  )
}
