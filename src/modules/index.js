import { NetworkModule }    from './network'
import { ConfigsModule }    from './configs'
import { OperationsModule } from './operations'
import { ObserveModule }    from './observe'
import { AutopilotModule }  from './autopilot'
import { SettingsModule }   from './settings'
import { PlatformModule }   from './platform'

/**
 * All registered modules in display order.
 *
 * To add a new vertical (e.g. HydroModule):
 *   1. Create src/modules/hydro/index.js following the same shape
 *   2. Import and add it here
 *   3. Its nav and routes are automatically wired in by App.jsx and Sidebar.jsx
 *
 * Module shape:
 * {
 *   id:        string          — unique identifier
 *   label:     string          — sidebar section heading
 *   icon:      LucideIcon      — section icon
 *   adminOnly: boolean?        — only shown when admin mode is active
 *   nav:    [{ to, text, icon }]
 *   routes: [{ path, load?, placeholder? }]
 *            load = () => import('...')   (code-split page)
 *            placeholder = string         (renders a "Coming soon" stub)
 * }
 */
export const MODULES = [
  NetworkModule,
  ConfigsModule,
  OperationsModule,
  ObserveModule,
  AutopilotModule,
  SettingsModule,
  PlatformModule,  // adminOnly — only visible when admin mode is on
]
