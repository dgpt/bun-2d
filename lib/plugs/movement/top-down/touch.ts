import { Entity } from 'lib/Entity'
import type { MovementSettings } from '../settings'
import { on } from 'lib/events'
import { MovementPlugin } from '../MovementPlugin'
import { findPath, getNextPathPoint, clearPath, hasActivePath } from '../pathfinding'
import Layer from 'lib/layer'

class TouchMovementPlugin extends MovementPlugin {
  private target?: Entity | { x: number, y: number }

  init(entity: Entity, settings?: MovementSettings) {
    // Increase force for touch movement to match keyboard feel
    const touchSettings = {
      ...settings,
      force: (settings?.force ?? 0.002) * 1.2,
      physics: {
        ...settings?.physics,
        // Slightly higher air friction for smoother pathfinding movement
        frictionAir: (settings?.physics?.frictionAir ?? 0.2) * 1.2
      }
    }
    super.init(entity, touchSettings)

    // Function to make a single entity interactive
    const makeEntityInteractive = (e: Entity) => {
      if (e.id !== entity.id) {
        e.eventMode = 'dynamic'
        e.cursor = 'pointer'
        e.hitArea = e.getBounds()
        e.on(Events.pointerTap, () => {
          // Set new target and path using physics body position
          this.target = e
          findPath(entity, e.body.position, e)
        })
      }
    }

    // Make existing entities interactive
    for (const e of Layer.get(Layers.entities)) {
      makeEntityInteractive(e)
    }

    // Listen for new entities and make them interactive too
    entity.gc(
      on(Events.entityAdded, (e) => {
        makeEntityInteractive(e)
      }),

      // Handle stage clicks for non-entity movement
      on(Events.pointerDown, ({ x, y }) => {
        // Check if we're clicking near an entity
        const nearestEntity = Layer.get(Layers.entities).find((e: Entity) => {
          if (e.id === entity.id) return false
          const dx = e.x - x
          const dy = e.y - y
          // Use entity width/height for proximity check
          const proximityThreshold = Math.max(e.width, e.height) * 0.75
          return Math.sqrt(dx * dx + dy * dy) <= proximityThreshold
        })

        // If clicking near an entity, target that entity
        if (nearestEntity) {
          this.target = nearestEntity
          findPath(entity, nearestEntity.body.position, nearestEntity)
        } else {
          // Otherwise, move to clicked position
          this.target = { x, y }
          findPath(entity, { x, y })
        }
      }),

      // Handle keyboard input by clearing the path
      on(Events.keyDown, () => {
        if (this.target) {
          this.stopMovement(entity)
        }
      }),

      // Handle collisions with target
      on(Events.collision, ({ a, b }) => {
        const otherEntity = a?.id === entity?.id ? b : a
        if (this.target && this.target instanceof Entity && otherEntity?.id === this.target.id) {
          this.stopMovement(entity)
        }
      })
    )
  }

  update(entity: Entity) {
    // Check if we have an active path first
    if (!hasActivePath(entity)) {
      super.update(entity)
      return
    }

    const nextPoint = getNextPathPoint(entity)
    if (nextPoint) {
      const dir = {
        x: nextPoint.x - entity.body.position.x,
        y: nextPoint.y - entity.body.position.y
      }

      // Normalize direction
      const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
      if (length > 0) {
        dir.x /= length
        dir.y /= length
      }

      this.setDirection(entity, dir)
    } else {
      this.stopMovement(entity)
    }

    super.update(entity)
  }

  private stopMovement(entity: Entity) {
    clearPath(entity)
    this.target = undefined
    this.setDirection(entity, { x: 0, y: 0 })
  }
}

export const touch = new TouchMovementPlugin('topDown:touch', {
  init: TouchMovementPlugin.prototype.init,
  update: TouchMovementPlugin.prototype.update
})
