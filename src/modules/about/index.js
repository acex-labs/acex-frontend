import { Info, ScrollText } from 'lucide-react'

export const AboutModule = {
  id: 'about',
  label: 'About',
  icon: Info,
  nav: [
    { to: '/about/changelog', text: 'Changelog', icon: ScrollText },
  ],
  routes: [
    { path: '/about/changelog', load: () => import('../../pages/about/ChangelogPage') },
  ],
}