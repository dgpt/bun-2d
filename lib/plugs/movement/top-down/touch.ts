import type { Entity } from 'lib/Entity'
import type { MovementSettings } from 'lib/plugs/movement'
import { Events, on, type EventData } from 'lib/events'
import { handleMovementAnimation } from '../animate'
import { getMovementDirection, setMovementDirection, applyMovementForce, normalizeDirection } from '../move'
import { MovementPlugin } from '../MovementPlugin'
import { findPath, getNextPathPoint, clearPath, hasActivePath } from '../pathfinding'
import Layers from 'lib/Layers'
import { DEFAULT_MOVEMENT_SETTINGS } from '../settings'

class TouchMovementPlugin extends MovementPlugin {
  private targetEntity?: Entity
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
        e.on(Events.pointerTap, () => {
          // Clear any existing path and target
          clearPath(entity)
          this.targetEntity = undefined
          this.stuckCounter = 0

          // Set new target and path using physics body position
          this.targetEntity = e
          const targetPos = e.body.position
          findPath(entity, targetPos, e)
        })
      }
    }

    // Make existing entities interactive
    for (const e of Layers.entities.entities) {
      makeEntityInteractive(e)
    }

    // Listen for new entities and make them interactive too
    entity.gc(
      on(Events.entityLayerAdded, (data: EventData[Events.entityLayerAdded]) => {
        if (data.layer === 'entities') {
          makeEntityInteractive(data.entity)
        }
      }),

      // Handle stage clicks for non-entity movement
      on(Events.pointerDown, (event: EventData[Events.pointerDown]) => {
        // Only handle clicks that aren't on entities
        const target = Array.from(Layers.entities.entities).find(e => {
          if (e === entity) return false
          const bounds = e.getBounds()
          return event.x >= bounds.left && event.x <= bounds.right &&
            event.y >= bounds.top && event.y <= bounds.bottom
        })

        if (!target) {
          // Clear any existing path and target
          clearPath(entity)
          this.targetEntity = undefined
          this.stuckCounter = 0

          // Find path to clicked position
          findPath(entity, { x: event.x, y: event.y })
        }
      }),

      // Handle keyboard input by clearing the path
      on(Events.keyDown, () => {
        if (hasActivePath(entity)) {
          clearPath(entity)
          this.targetEntity = undefined
          this.stuckCounter = 0
        }
      }),

      // Handle collisions
      on(Events.collision, (event) => {
        const { a, b } = event
        const otherEntity = a?.id === entity?.id ? b : a
        if (this.targetEntity && otherEntity?.id === this.targetEntity.id) {
          clearPath(entity)
          this.targetEntity = undefined
          this.stuckCounter = 0
        }
      })
    )
  }

  update(entity: Entity) {
    // Check for active path first
    const nextPoint = getNextPathPoint(entity)
    if (nextPoint) {
      const dir = {
        x: nextPoint.x - entity.body.position.x,
        y: nextPoint.y - entity.body.position.y
      }

      // Calculate current velocity magnitude
      const currentVelocity = Math.sqrt(entity.velocity.x ** 2 + entity.velocity.y ** 2)

      // Calculate distance to target
      const distance = Math.sqrt(dir.x * dir.x + dir.y * dir.y)

      // Only check for stuck state if we're far enough from target (using entity width)
      const minDistance = entity.width * 1.5
      if (distance > minDistance) {
        // Get movement settings to determine velocity threshold
        const settings = entity.plugins.get(this.name) as MovementSettings
        const maxSpeed = settings?.maxSpeed ?? DEFAULT_MOVEMENT_SETTINGS.maxSpeed
        const velocityThreshold = maxSpeed * 0.01 // 1% of max speed as threshold

        // Only start checking for stuck state after a few frames
        if (this.lastVelocity > 0) {
          // Check if we're stuck (very low absolute velocity)
          if (currentVelocity < velocityThreshold) {
            this.stuckCounter++
          } else {
            this.stuckCounter = 0
          }

          // If stuck for too long, stop movement
          if (this.stuckCounter > 60) { // Increased threshold
            clearPath(entity)
            this.targetEntity = undefined
            this.stuckCounter = 0
            return
          }
        }
      }

      this.lastVelocity = currentVelocity

      // Get distance to final destination if we have a target entity
      let shouldStop = false
      if (this.targetEntity) {
        const finalDx = this.targetEntity.x - entity.x
        const finalDy = this.targetEntity.y - entity.y
        const finalDistance = Math.sqrt(finalDx * finalDx + finalDy * finalDy)
        shouldStop = finalDistance < this.targetEntity.width / 2
      }

      // Stop if we're close enough to next point or final destination
      if (distance < 5 || shouldStop) {
        clearPath(entity)
        this.targetEntity = undefined
        return
      }

      // Apply force more directly to match keyboard movement feel
      const normalized = normalizeDirection(dir)
      applyMovementForce(entity, normalized.x * 1.2, normalized.y * 1.2) // Boost force application
      handleMovementAnimation(entity, normalized)
      return
    }

    // Fall back to direct movement if no path
    const dir = getMovementDirection(entity)
    if (dir.x === 0 && dir.y === 0) return

    const normalized = normalizeDirection(dir)
    applyMovementForce(entity, normalized.x, normalized.y)
    handleMovementAnimation(entity, normalized)
  }
}

export const touch = new TouchMovementPlugin('topDown:touch', {
  init: TouchMovementPlugin.prototype.init,
  update: TouchMovementPlugin.prototype.update
})
