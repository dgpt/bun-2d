import type { IPointData } from 'pixi.js'
import type { Entity } from 'lib/Entity'

// Available movement types
export enum Movement {
  topDown = 'topDown'
}

// Base movement settings that can be extended by other plugins
export interface MovementSettings {
  spriteDirection?: IPointData
}

// Base movement state that can be extended by other plugins
export interface MovementState {
  direction: IPointData
}

// Extend Entity's plugin settings
declare module 'lib/Entity' {
  export interface EntityPluginSettings {
    movement: MovementSettings
  }
}