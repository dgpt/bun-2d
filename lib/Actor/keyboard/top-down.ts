import { Events } from '../../events'
import { Keys } from '../../keys'
import { Plugin } from '../../Plugin'
import type { Entity } from '../../Entity'
import type { IPointData } from 'pixi.js'
import { applyMovementForce, handleMovementAnimation, type MovementSettings, DEFAULT_SPRITE_DIRECTION } from '../movement'

// Track movement direction for each entity
const movement = new WeakMap<Entity, IPointData>()
const settings = new WeakMap<Entity, MovementSettings>()

// Default settings for top-down movement
const DEFAULT_SETTINGS: MovementSettings = {
  spriteDirection: { x: 1, y: 0 } // Sprite faces right by default
}

export const topDown = new Plugin<MovementSettings>('keyboard-top-down', {
  init(entity: Entity, pluginSettings?: MovementSettings) {
    settings.set(entity, { ...DEFAULT_SETTINGS, ...pluginSettings })
  },

  events: {
    [Events.keyDown]: (entity: Entity, event: Event, data: KeyboardEvent) => {
      // Initialize movement tracking
      const dir = movement.get(entity) ?? { x: 0, y: 0 }
      movement.set(entity, dir)

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
    },

    [Events.keyUp]: (entity: Entity, event: Event, data: KeyboardEvent) => {
      const dir = movement.get(entity)
      if (!dir) return

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
    },
  },

  update(entity: Entity) {
    const dir = movement.get(entity)
    if (!dir || (dir.x === 0 && dir.y === 0)) return

    // Normalize diagonal movement
    const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
    if (length > 0) {
      const normalized = {
        x: dir.x / length,
        y: dir.y / length
      }
      applyMovementForce(entity, normalized.x, normalized.y)
      handleMovementAnimation(entity, normalized, settings.get(entity)?.spriteDirection ?? DEFAULT_SPRITE_DIRECTION)
    }
  }
})
