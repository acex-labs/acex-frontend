import { Settings, KeyRound, Radio, HardDriveDownload, GitBranch, Sparkles, Info } from 'lucide-react'

export const SettingsModule = {
  id: 'settings',
  label: 'Settings',
  icon: Settings,
  nav: [
    { to: '/settings/credentials',       text: 'Credentials',       icon: KeyRound },
    { to: '/settings/telemetry-agents',  text: 'Telemetry Agents',  icon: Radio },
    { to: '/settings/collection-agents', text: 'Collection Agents', icon: HardDriveDownload },
    { to: '/settings/git-repositories',  text: 'Git Repositories',  icon: GitBranch },
    { to: '/settings/changelog',         text: "What's new",        icon: Sparkles },
    { to: '/settings/about',             text: 'About',             icon: Info },
  ],
  routes: [
    { path: '/settings/credentials',       load: () => import('../../pages/settings/CredentialsPage') },
    { path: '/settings/telemetry-agents',  load: () => import('../../pages/settings/TelemetryAgentsPage') },
    { path: '/settings/collection-agents', load: () => import('../../pages/settings/CollectionAgentsPage') },
    { path: '/settings/git-repositories',  load: () => import('../../pages/settings/GitRepositoriesPage') },
    { path: '/settings/changelog',         load: () => import('../../pages/settings/ChangelogPage') },
    { path: '/settings/about',             load: () => import('../../pages/settings/AboutPage') },
  ],
}
