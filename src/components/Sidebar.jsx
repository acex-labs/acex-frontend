import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ChevronDown, Menu, PanelLeftClose,
  LogOut, UserCircle, Sun, Moon, Monitor, ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useAdmin } from '../context/AdminContext'
import { MODULES } from '../modules'

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
  const { mode, cycleMode } = useTheme()
  const { isAdmin, isAdminMode, toggleAdminMode } = useAdmin()
  const username = user?.profile?.preferred_username || user?.profile?.email || ''

  // Only show modules that are either not adminOnly, or adminOnly and mode is active
  const visibleModules = MODULES.filter(m => !m.adminOnly || isAdminMode)

  const findActiveSection = () =>
    visibleModules.find(m =>
      m.nav?.some(item =>
        item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
      )
    )?.id ?? null

  const activeSection = findActiveSection()

  const [open, setOpen] = useState(() => {
    const initial = {}
    visibleModules.forEach(m => { initial[m.id] = false })
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

      {/* Admin mode banner */}
      {isAdminMode && !collapsed && (
        <div className="mx-2 mb-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5">
          <ShieldAlert size={10} className="text-amber-400 shrink-0" />
          <span className="text-[10px] text-amber-400 font-semibold">Admin mode</span>
        </div>
      )}
      {isAdminMode && collapsed && (
        <div className="flex justify-center mb-1">
          <ShieldAlert size={12} className="text-amber-400" />
        </div>
      )}

      {/* Dashboard */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-px">
        <div className="space-y-0.5 pt-0.5 pb-1">
          <NavItem to="/" text="Dashboard" icon={LayoutDashboard} end collapsed={collapsed} />
        </div>

        {visibleModules.map(m => {
          const isOpen = collapsed || open[m.id]
          const SectionIcon = m.icon

          return (
            <div key={m.id}>
              {!collapsed && (
                <button
                  onClick={() => toggle(m.id)}
                  className={[
                    'flex items-center justify-between w-full px-2 py-1 mt-2',
                    'text-[10px] font-semibold uppercase tracking-widest rounded transition-colors',
                    m.adminOnly ? 'text-amber-500/70 hover:text-amber-400' : 'text-subtle hover:text-content',
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
          <UserCircle size={13} className="text-subtle shrink-0" />
          {!collapsed && <span className="text-[11px] text-subtle truncate flex-1">{username}</span>}

          {isAdmin && (
            <button
              onClick={toggleAdminMode}
              title={isAdminMode ? 'Exit admin mode' : 'Enter admin mode'}
              className={['transition-colors p-0.5 rounded', isAdminMode ? 'text-amber-400 hover:text-amber-300' : 'text-subtle hover:text-amber-400'].join(' ')}
            >
              <ShieldAlert size={12} />
            </button>
          )}

          <button onClick={cycleMode} title={`Theme: ${mode}`} className="text-subtle hover:text-brand transition-colors p-0.5 rounded">
            {mode === 'system' ? <Monitor size={12} /> : mode === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
          </button>
          <button onClick={logout} title="Logout" className="text-subtle hover:text-brand transition-colors p-0.5 rounded">
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
