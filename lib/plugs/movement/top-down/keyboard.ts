import type { Entity } from 'lib/Entity'
import type { MovementSettings } from 'lib/plugs/movement'
import { Events, on, type EventData } from 'lib/events'
import { Keys } from 'lib/keys'
import { Plugin } from 'lib/Plugin'
import { handleMovementAnimation } from '../animate'
import { getMovementDirection, setMovementDirection, applyMovementForce, normalizeDirection } from '../move'
import { MovementPlugin } from '../MovementPlugin'

export const keyboard = new MovementPlugin('topDown:keyboard', {
  init(entity: Entity, settings?: MovementSettings) {
    // Register keyboard event handlers
    entity.gc(
      on(Events.keyDown, (event) => {
        const dir = getMovementDirection(entity)
        const oldDir = { ...dir }

        // Update movement direction based on key
        switch (event.key.toLowerCase()) {
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

      on(Events.keyUp, (event: Event, data?: EventData<'on'>[Events.keyUp]) => {
        if (!data) return

        // Don't process input if entity is static
        if (entity.static) return

        const dir = getMovementDirection(entity)
        const oldDir = { ...dir }

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
      })
    )
  },

  update(entity: Entity) {
    // Don't apply forces if entity is static
    if (entity.static) return

    const dir = getMovementDirection(entity)
    if (dir.x === 0 && dir.y === 0) return

    const normalized = normalizeDirection(dir)
    applyMovementForce(entity, normalized.x, normalized.y)
    handleMovementAnimation(entity, normalized)
  }
})
