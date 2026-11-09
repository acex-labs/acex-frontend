import { Bug, Download, Settings } from 'lucide-react'

export const CveModule = {
  id: 'cve',
  label: 'CVEs',
  icon: Bug,
  nav: [
    { to: '/cves', text: 'All CVEs', icon: Bug, end: true },
    { to: '/cves/discover', text: 'Discover CVEs', icon: Download },
    { to: '/cves/settings', text: 'Settings', icon: Settings },
  ],
  routes: [
    { path: '/cves', load: () => import('../../pages/cve/CvesPage') },
    { path: '/cves/discover', load: () => import('../../pages/cve/DiscoverPage') },
    { path: '/cves/settings', load: () => import('../../pages/cve/SettingsPage') },
  ],
}
