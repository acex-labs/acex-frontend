import { Eye, Activity, Radio, BarChart3, History } from 'lucide-react'

export const ObserveModule = {
  id: 'observe',
  label: 'Observe',
  icon: Eye,
  nav: [
    { to: '/observe/icmp',          text: 'ICMP',           icon: Activity },
    { to: '/observe/telemetry',     text: 'Telemetry',      icon: Radio },
    { to: '/observe/dashboards',    text: 'Dashboards',     icon: BarChart3 },
    { to: '/observe/config-history',text: 'Config History', icon: History },
  ],
  routes: [
    { path: '/observe/icmp',           placeholder: 'ICMP' },
    { path: '/observe/telemetry',      placeholder: 'Telemetry' },
    { path: '/observe/dashboards',     placeholder: 'Dashboards' },
    { path: '/observe/config-history', placeholder: 'Config History' },
  ],
}
