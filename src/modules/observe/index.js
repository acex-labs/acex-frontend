import { Eye, Activity, Radio, BarChart3, History, Waypoints } from 'lucide-react'

export const ObserveModule = {
  id: 'observe',
  label: 'Observe',
  icon: Eye,
  nav: [
    { to: '/observe/topology',      text: 'Topology',       icon: Waypoints },
    { to: '/observe/icmp',          text: 'ICMP',           icon: Activity },
    { to: '/observe/telemetry',     text: 'Telemetry',      icon: Radio },
    { to: '/observe/dashboards',    text: 'Dashboards',     icon: BarChart3 },
    { to: '/observe/config-history',text: 'Config History', icon: History },
  ],
  routes: [
    { path: '/observe/topology',       load: () => import('../../pages/observe/TopologyPage') },
    { path: '/observe/icmp',           placeholder: 'ICMP' },
    { path: '/observe/telemetry',      placeholder: 'Telemetry' },
    { path: '/observe/dashboards',     load: () => import('../../pages/observe/DashboardsPage') },
    { path: '/observe/config-history', load: () => import('../../pages/observe/ConfigHistoryPage') },
  ],
}
