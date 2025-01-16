import type { MovementSettings } from './movement/settings'

declare module 'lib/Plugin' {
  export interface PluginSettings {
    movement: MovementSettings
  }
}