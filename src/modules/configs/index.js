import { FileCode2, Wrench, TerminalSquare } from 'lucide-react'

export const ConfigsModule = {
  id: 'configs',
  label: 'Configs',
  icon: FileCode2,
  nav: [
    { to: '/configs/config-maps', text: 'Config Maps', icon: FileCode2 },
    { to: '/configs/translator',  text: 'Translator',  icon: TerminalSquare },
    { to: '/configs/neds',        text: 'NEDs',        icon: Wrench },
  ],
  routes: [
    { path: '/configs/config-maps', load: () => import('../../pages/configs/ConfigMapsPage') },
    { path: '/configs/translator',  load: () => import('../../pages/configs/TranslatorPage') },
    { path: '/configs/neds',        load: () => import('../../pages/network/NEDsPage') },
  ],
}
