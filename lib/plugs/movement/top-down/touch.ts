import type { Entity } from 'lib/Entity'
import type { MovementSettings } from '../types'
import { Events } from 'lib/events'
import { Plugin } from 'lib/Plugin'
import { DEFAULT_SPRITE_DIRECTION, handleMovementAnimation } from '../animate'
import { getMovementDirection, setMovementDirection, applyMovementForce, normalizeDirection } from '../move'

// Default settings for touch movement
const DEFAULT_SETTINGS: Required<MovementSettings> = {
  spriteDirection: DEFAULT_SPRITE_DIRECTION
}

export const touch = new Plugin<MovementSettings>('touch-top-down', {
  init(entity: Entity, settings?: MovementSettings) {
    // Initialize with merged settings
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings }
    entity.setPluginSettings('movement', mergedSettings)
    setMovementDirection(entity, { x: 0, y: 0 })

    // Make entity interactive for touch events
    entity.eventMode = 'static'
    entity.cursor = 'pointer'
  },

  events: {
    [Events.pointerTap]: (entity: Entity, event: Event, data: { x: number, y: number }) => {
      const dir = {
        x: data.x - entity.x,
        y: data.y - entity.y
      }
      setMovementDirection(entity, dir)
    },

    [Events.touchMove]: (entity: Entity, event: Event, data: { x: number, y: number }) => {
      const dir = {
        x: data.x - entity.x,
        y: data.y - entity.y
      }
      setMovementDirection(entity, dir)
    }
  },

  update(entity: Entity) {
    const dir = getMovementDirection(entity)
    if (dir.x === 0 && dir.y === 0) return

    const normalized = normalizeDirection(dir)
    applyMovementForce(entity, normalized.x, normalized.y)

    const settings = entity.getPluginSettings<MovementSettings>('movement')
    handleMovementAnimation(entity, normalized, settings?.spriteDirection ?? DEFAULT_SETTINGS.spriteDirection)
  }
})
