import type { Entity } from 'lib/Entity'
import type { MovementSettings } from 'lib/plugs/movement'
import { Events, on } from 'lib/events'
import { Keys } from 'lib/keys'
import { handleMovementAnimation } from '../animate'
import { getMovementDirection, setMovementDirection, applyMovementForce, normalizeDirection } from '../move'
import { MovementPlugin } from '../MovementPlugin'
import { DEFAULT_MOVEMENT_SETTINGS } from '../settings'

class KeyboardMovementPlugin extends MovementPlugin {
  init(entity: Entity, settings?: MovementSettings) {
    // Initialize with default movement settings
    const mergedSettings = {
      ...DEFAULT_MOVEMENT_SETTINGS,
      ...settings
    }
    super.init(entity, mergedSettings)

    // Register keyboard event handlers
    entity.gc(
      on(Events.keyDown, (_, { key }) => {
        const dir = getMovementDirection(entity)

        // Update movement direction based on key
        switch (key.toLowerCase()) {
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
      }),

      on(Events.keyUp, (_, { key }) => {
        // Don't process input if entity is static
        if (entity.static) return

        const dir = getMovementDirection(entity)

        // Reset movement direction if it matches the released key
        switch (key.toLowerCase()) {
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
      })
    )
  }

  update(entity: Entity) {
    // Don't apply forces if entity is static
    if (entity.static) return

    const dir = getMovementDirection(entity)
    if (dir.x === 0 && dir.y === 0) return

    // Always normalize direction to ensure consistent force magnitude
    const normalized = normalizeDirection(dir)
    applyMovementForce(entity, normalized.x, normalized.y)
    handleMovementAnimation(entity, normalized)
  }
}

export const keyboard = new KeyboardMovementPlugin('topDown:keyboard', {
  init: KeyboardMovementPlugin.prototype.init,
  update: KeyboardMovementPlugin.prototype.update
})
