import type { Entity } from 'lib/Entity'
import type { MovementSettings } from 'lib/plugs/movement'
import { Events, on, type EventData } from 'lib/events'
import { handleMovementAnimation } from '../animate'
import { getMovementDirection, setMovementDirection, applyMovementForce, normalizeDirection } from '../move'
import { MovementPlugin } from '../MovementPlugin'

export const touch = new MovementPlugin('topDown:touch', {
  init(entity: Entity, settings?: MovementSettings) {
    entity.static = false

    // Make entity interactive for touch events
    entity.eventMode = 'dynamic'
    entity.cursor = 'pointer'

    // Register global touch event handlers
    entity.gc(
      on(Events.pointerDown, (event: EventData[Events.pointerDown]) => {
        const dir = {
          x: event.x - entity.x,
          y: event.y - entity.y
        }
        setMovementDirection(entity, dir)
      }),
    )
  },

  update(entity: Entity) {
    const dir = getMovementDirection(entity)
    if (dir.x === 0 && dir.y === 0) return

    const normalized = normalizeDirection(dir)
    applyMovementForce(entity, normalized.x, normalized.y)
    handleMovementAnimation(entity, normalized)
  }
})
