import { Network, Server, MapPin, Globe, Cloud, Package, BookUser, Upload } from 'lucide-react'

export const NetworkModule = {
  id: 'network',
  label: 'Network',
  icon: Network,
  nav: [
    { to: '/network/nodes',         text: 'Nodes',         icon: Server },
    { to: '/network/sites',         text: 'Sites',         icon: MapPin },
    { to: '/network/regions',       text: 'Regions',       icon: Globe },
    { to: '/network/logical-nodes', text: 'Logical Nodes', icon: Cloud },
    { to: '/network/assets',        text: 'Assets',        icon: Package },
    { to: '/network/contacts',      text: 'Contacts',      icon: BookUser },
    { to: '/network/import',        text: 'Import',        icon: Upload },
  ],
  routes: [
    { path: '/network/nodes',             load: () => import('../../pages/network/NodesPage') },
    { path: '/network/nodes/:id',         load: () => import('../../pages/network/NodePage') },
    { path: '/network/sites',             load: () => import('../../pages/network/SitesPage') },
    { path: '/network/sites/:id',         load: () => import('../../pages/network/SitePage') },
    { path: '/network/regions',           load: () => import('../../pages/network/RegionsPage') },
    { path: '/network/logical-nodes',     load: () => import('../../pages/network/LogicalNodesPage') },
    { path: '/network/assets',            load: () => import('../../pages/network/AssetsPage') },
    { path: '/network/contacts',          load: () => import('../../pages/network/ContactsPage') },
    { path: '/network/contacts/:id',      load: () => import('../../pages/network/ContactPage') },
    { path: '/network/import',            load: () => import('../../pages/network/NEDsPage'), placeholder: 'Import' },
  ],
}
