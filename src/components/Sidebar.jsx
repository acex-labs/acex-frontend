import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ChevronDown, Menu, PanelLeftClose,
  LogOut, UserCircle, Sun, Moon, Monitor,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { activeModules } from '../modules'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
// For the navigation items in the sidebar, ex. nodes, sites etc under network
function NavItem({ to, text, icon: Icon, end, collapsed, textSize = '12px' }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? text : undefined}
      style={{ fontSize: textSize }}
      className={({ isActive }) =>
        [
          'flex items-center gap-2 w-full py-1 rounded transition-colors duration-150',
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
  const { mode, cycleMode } = useTheme()
  const profile = user?.profile
  const label = profile?.given_name || profile?.preferred_username || profile?.email || ''
  const fullName =
    [profile?.given_name, profile?.family_name].filter(Boolean).join(' ') || profile?.name || null
  const email = profile?.email || null

  const modules = activeModules()

  const findActiveSection = () =>
    modules.find(m =>
      m.nav?.some(item =>
        item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
      )
    )?.id ?? null

  const activeSection = findActiveSection()

  const [open, setOpen] = useState(() => {
    const initial = {}
    modules.forEach(m => { initial[m.id] = false })
    if (activeSection) initial[activeSection] = true
    return initial
  })

  useEffect(() => {
    if (activeSection) {
      setOpen(prev => prev[activeSection] ? prev : { ...prev, [activeSection]: true })
    }
  }, [location.pathname, activeSection])

  const toggle = id => setOpen(prev => ({ ...prev, [id]: !prev[id] }))

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

      {/* Dashboard */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-px">
        <div className="space-y-0.5 pt-0.5 pb-1">
          <NavItem to="/" text="Dashboard" icon={LayoutDashboard} end collapsed={collapsed} textSize="14px" />
        </div>

        {modules.map(m => {
          const isOpen = collapsed || open[m.id]
          const SectionIcon = m.icon

          return (
            <div key={m.id}>
              {!collapsed && (
                <button
                  onClick={() => toggle(m.id)}
                  className={[
                    'flex items-center justify-between w-full px-2 py-1 mt-2',
                    'text-[12px] font-semibold uppercase tracking-widest rounded transition-colors',
                    'text-subtle hover:text-content',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1.5">
                    <SectionIcon size={10} />
                    <span>{m.label}</span>
                  </div>
                  <ChevronDown size={10} className={['transition-transform duration-200', isOpen ? '' : '-rotate-90'].join(' ')} />
                </button>
              )}

              {collapsed && <div className="border-t border-edge mx-1 my-2" />}

              <div className="overflow-hidden transition-all duration-200 ease-in-out" style={{ maxHeight: isOpen ? '600px' : '0' }}>
                <div className="space-y-0.5 pt-0.5">
                  {m.nav?.map(item => <NavItem key={item.to} {...item} collapsed={collapsed} />)}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-edge px-2 py-2">
        <div className={['flex items-center gap-2', collapsed ? 'flex-col' : 'px-1'].join(' ')}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="flex items-center gap-2 min-w-0 flex-1 rounded text-subtle hover:text-content transition-colors"
                title={fullName || label}
              >
                <UserCircle size={20} className="shrink-0" />
                {!collapsed && <span className="text-[12px] truncate">{label}</span>}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="top"
                align="start"
                sideOffset={8}
                className="z-50 min-w-[200px] rounded-lg border border-edge bg-surface p-1.5 shadow-xl"
              >
                <div className="px-2 py-1.5">
                  {fullName && <p className="text-[13px] font-medium text-content">{fullName}</p>}
                  {email && <p className="text-[11px] text-subtle truncate">{email}</p>}
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <button onClick={cycleMode} title={`Theme: ${mode}`} className="text-subtle hover:text-brand transition-colors p-0.5 rounded">
            {mode === 'system' ? <Monitor size={20} /> : mode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={logout} title="Logout" className="text-subtle hover:text-brand transition-colors p-0.5 rounded">
            <LogOut size={20} />
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
