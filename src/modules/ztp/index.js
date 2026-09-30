import { Rocket, Activity, Settings2 } from 'lucide-react'

export const ZtpModule = {
  id: 'ztp',
  label: 'ZTP',
  icon: Rocket,
  nav: [
    { to: '/ztp/status',   text: 'Status',       icon: Activity },
    { to: '/ztp/settings', text: 'ZTP Settings', icon: Settings2 },
  ],
  routes: [
    { path: '/ztp/status',   placeholder: 'ZTP Status' },
    { path: '/ztp/settings', placeholder: 'ZTP Settings' },
  ],
}