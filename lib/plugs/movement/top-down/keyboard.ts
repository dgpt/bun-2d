import type { Entity } from 'lib/Entity'
import type { MovementSettings } from '../types'
import { Events } from 'lib/events'
import { Keys } from 'lib/keys'
import { Plugin } from 'lib/Plugin'
import { DEFAULT_SPRITE_DIRECTION, handleMovementAnimation } from '../animate'
import { getMovementDirection, setMovementDirection, applyMovementForce, normalizeDirection } from '../move'

// Default settings for top-down movement
const DEFAULT_SETTINGS: Required<MovementSettings> = {
  spriteDirection: DEFAULT_SPRITE_DIRECTION
}

export const keyboard = new Plugin<MovementSettings>('keyboard-top-down', {
  init(entity: Entity, settings?: MovementSettings) {
    // Initialize with merged settings
    const mergedSettings = { ...DEFAULT_SETTINGS, ...settings }
    entity.setPluginSettings('movement', mergedSettings)
    setMovementDirection(entity, { x: 0, y: 0 })
  },

  events: {
    [Events.keyDown]: (entity: Entity, event: Event, data: KeyboardEvent) => {
      const dir = getMovementDirection(entity)

      // Update movement direction based on key
      switch (data.key.toLowerCase()) {
        case Keys.W:
        case Keys.ArrowUp:
          dir.y = -1
          break
        case Keys.S:
        case Keys.ArrowDown:
          dir.y = 1
          break
        case Keys.A:
        case Keys.ArrowLeft:
          dir.x = -1
          break
        case Keys.D:
        case Keys.ArrowRight:
          dir.x = 1
          break
      }

      setMovementDirection(entity, dir)
    },

    [Events.keyUp]: (entity: Entity, event: Event, data: KeyboardEvent) => {
      const dir = getMovementDirection(entity)

      // Reset movement direction if it matches the released key
      switch (data.key.toLowerCase()) {
        case Keys.W:
        case Keys.ArrowUp:
          if (dir.y === -1) dir.y = 0
          break
        case Keys.S:
        case Keys.ArrowDown:
          if (dir.y === 1) dir.y = 0
          break
        case Keys.A:
        case Keys.ArrowLeft:
          if (dir.x === -1) dir.x = 0
          break
        case Keys.D:
        case Keys.ArrowRight:
          if (dir.x === 1) dir.x = 0
          break
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
