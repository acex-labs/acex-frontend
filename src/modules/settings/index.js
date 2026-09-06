import { Settings, KeyRound, Radio, HardDriveDownload, Info } from 'lucide-react'

export const SettingsModule = {
  id: 'settings',
  label: 'Settings',
  icon: Settings,
  nav: [
    { to: '/settings/credentials',       text: 'Credentials',       icon: KeyRound },
    { to: '/settings/telemetry-agents',  text: 'Telemetry Agents',  icon: Radio },
    { to: '/settings/collection-agents', text: 'Collection Agents', icon: HardDriveDownload },
    { to: '/settings/about',             text: 'About',             icon: Info },
  ],
  routes: [
    { path: '/settings/credentials',       load: () => import('../../pages/settings/CredentialsPage') },
    { path: '/settings/telemetry-agents',  load: () => import('../../pages/settings/TelemetryAgentsPage') },
    { path: '/settings/collection-agents', load: () => import('../../pages/settings/CollectionAgentsPage') },
    { path: '/settings/about',             placeholder: 'About' },
  ],
}
