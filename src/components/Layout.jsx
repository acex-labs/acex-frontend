import { useState } from 'react'
import Sidebar from './Sidebar'
import GlobalAiPanel, { AiToggleButton } from './ai/GlobalAiPanel'
import BugReportWidget from './BugReportWidget'

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  )

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main data-ai-content className="flex-1 overflow-auto text-content">
        {children}
      </main>
      <GlobalAiPanel />
      <AiToggleButton />
      <BugReportWidget />
    </div>
  )
}
