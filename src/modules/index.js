import { NetworkModule }    from './network'
import { ConfigsModule }    from './configs'
import { OperationsModule } from './operations'
import { ObserveModule }    from './observe'
import { ComplianceModule } from './compliance'
import { AutopilotModule }  from './autopilot'
import { ZtpModule }        from './ztp'
import { SettingsModule }   from './settings'
import { ActivityModule }   from './activity'
import { CveModule }        from './cve'
import { SamruaiModule }    from './samruai'
import { hasService }       from '../services'

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
 *   requires?: string          — a service from GET /api/v1/services; the module
 *                                is only shown when ACEX lists it (see services.js)
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
  ComplianceModule,
  AutopilotModule,
  ZtpModule,
  CveModule,
  SamruaiModule,
  ActivityModule,
  SettingsModule,
]

export const isModuleAvailable = (m) => !m.requires || hasService(m.requires)

/** The modules this deployment has. Call it while rendering: services load before the app renders. */
export const activeModules = () => MODULES.filter(isModuleAvailable)
