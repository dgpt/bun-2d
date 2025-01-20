import type { Entity } from 'lib/Entity'
import type { MovementSettings } from '../settings'
import { on } from 'lib/events'
import { Keys } from 'lib/keys'
import { MovementPlugin } from '../MovementPlugin'

class KeyboardMovementPlugin extends MovementPlugin {
  init(entity: Entity, settings?: MovementSettings) {
    super.init(entity, settings)

    // Register keyboard event handlers
    entity.gc(
      on(Events.keyDown, (key) => {
        if (entity.static) return

        const data = this.getMovementData(entity)
        const dir = { ...data.direction }

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

        this.setDirection(entity, dir)
      }),

      on(Events.keyUp, (key) => {
        if (entity.static) return

        const data = this.getMovementData(entity)
        const dir = { ...data.direction }

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

        this.setDirection(entity, dir)
      })
    )
  }
}

export const keyboard = new KeyboardMovementPlugin('topDown:keyboard', {
  init: KeyboardMovementPlugin.prototype.init,
  update: MovementPlugin.prototype.update
})
