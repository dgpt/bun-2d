import { Entity } from 'lib/Entity'
import type { MovementSettings, Target } from '../types'
import { on } from 'lib/events'
import { handleMovementAnimation } from '../animate'
import { applyMovementForce, normalizeDirection } from '../move'
import { MovementPlugin } from '../MovementPlugin'
import { findPath, getNextPathPoint, clearPath, hasActivePath } from '../pathfinding'
import { DEFAULT_MOVEMENT_SETTINGS } from '../settings'
import Layer from 'lib/layer'

class TouchMovementPlugin extends MovementPlugin {
  private target?: Target
  private lastVelocity = 0
  private stuckCounter = 0

  init(entity: Entity, settings?: MovementSettings) {
    // Initialize with default movement settings
    const mergedSettings = {
      ...DEFAULT_MOVEMENT_SETTINGS,
      ...settings,
      // Increase force for touch movement to match keyboard feel
      force: (settings?.force || DEFAULT_MOVEMENT_SETTINGS.force) * 20
    }
    super.init(entity, mergedSettings)

    // Function to make a single entity interactive
    const makeEntityInteractive = (e: Entity) => {
      if (e.id !== entity.id) {
        e.eventMode = 'dynamic'
        e.cursor = 'pointer'
        e.hitArea = e.getBounds()
        e.on(Events.pointerTap, () => {
          console.log('entity tap', e)
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
    console.log('events', Events)

    // Listen for new entities and make them interactive too
    entity.gc(
      on(Events.entityAdded, (entity) => {
        makeEntityInteractive(entity)
      }),

      // Handle stage clicks for non-entity movement
      on(Events.pointerDown, ({ x, y }) => {
        console.log('pointer down', x, y)

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

      // Handle keyboard input by clearing the path only if we have a target
      on(Events.keyDown, () => {
        clearPath(entity)
        this.target = undefined
        this.stuckCounter = 0
      }),

      // Handle collisions
      on(Events.collision, ({ a, b }) => {
        const otherEntity = a?.id === entity?.id ? b : a
        console.log('collision', otherEntity, this.target)
        if (this.target && this.target instanceof Entity && otherEntity?.id === this.target.id) {
          console.log('collision with target')
          clearPath(entity)
          this.target = undefined
          this.stuckCounter = 0
        }
      })
    )
  }

  update(entity: Entity) {
    if (!this.target) return

    // Check if we have an active path first
    if (!hasActivePath(entity)) {
      this.stopMovement(entity)
      return
    }

    const nextPoint = getNextPathPoint(entity)
    if (nextPoint) {
      const dir = {
        x: nextPoint.x - entity.body.position.x,
        y: nextPoint.y - entity.body.position.y
      }

      // Apply force more directly to match keyboard movement feel
      const normalized = normalizeDirection(dir)
      applyMovementForce(entity, normalized.x * 1.5, normalized.y * 1.5) // Boost force application
      handleMovementAnimation(entity, normalized)
      return
    }

    this.stopMovement(entity)
  }

  private stopMovement(entity: Entity) {
    clearPath(entity)
    this.target = undefined
    this.stuckCounter = 0
  }
}

export const touch = new TouchMovementPlugin('topDown:touch', {
  init: TouchMovementPlugin.prototype.init,
  update: TouchMovementPlugin.prototype.update
})
