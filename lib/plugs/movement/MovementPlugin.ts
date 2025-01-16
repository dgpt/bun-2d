import { Plugin } from 'lib/Plugin'
import type { MovementSettings } from './settings'
import { setMovementDirection } from './move'
import { Entity } from 'lib/Entity'
import { DEFAULT_MOVEMENT_SETTINGS } from './settings'

// extends Plugin and adds common movement plugin logic
export class MovementPlugin extends Plugin<MovementSettings> {
  init(entity: Entity, settings?: MovementSettings) {
    // Ensure entity is not static for movement
    entity.static = false

    // Initialize with merged settings
    const mergedSettings = {
      ...DEFAULT_MOVEMENT_SETTINGS,
      ...settings
    }

    // Store settings under plugin name
    entity.plugins.set(this.name, mergedSettings)
    setMovementDirection(entity, { x: 0, y: 0 })
  }
}