import { Plugin } from 'lib/Plugin'
import type { MovementSettings, MovementState, Direction } from './settings'
import { DEFAULT_MOVEMENT_SETTINGS } from './settings'
import { Entity } from 'lib/Entity'
import { IPointData } from 'pixi.js'
import { Body } from 'matter-js'

type MovementData = {
  direction: IPointData
  state: MovementState
  lastInput: number
  lastMovement: number
  currentAnimation?: Animations
  lastMovingDirection: Direction
  currentForce: number  // Track current force for acceleration
  lastUpdate: number    // Track time for acceleration calculations
}

// Track movement data for each entity
const movementData = new WeakMap<Entity, MovementData>()

export class MovementPlugin extends Plugin<MovementSettings> {
  init(entity: Entity, settings?: MovementSettings) {
    // Initialize with merged settings
    const mergedSettings = {
      ...DEFAULT_MOVEMENT_SETTINGS,
      ...settings,
      physics: {
        ...DEFAULT_MOVEMENT_SETTINGS.physics,
        ...settings?.physics
      }
    }

    // Store settings under plugin name
    entity.plugins.set(this.name, mergedSettings)

    // Apply physics settings to body
    if (mergedSettings.physics) {
      // Don't apply isStatic directly - use entity.static setter
      const { isStatic, ...physicsSettings } = mergedSettings.physics
      Body.set(entity.body, physicsSettings)
      entity.static = isStatic ?? false
    }

    // Initialize movement data
    movementData.set(entity, {
      direction: { x: 0, y: 0 },
      state: 'idle',
      lastInput: Date.now(),
      lastMovement: Date.now(),
      lastMovingDirection: 'right', // Default facing direction
      currentForce: 0,
      lastUpdate: Date.now()
    })
  }

  protected getMovementData(entity: Entity): MovementData {
    let data = movementData.get(entity)
    if (!data) {
      data = {
        direction: { x: 0, y: 0 },
        state: 'idle',
        lastInput: Date.now(),
        lastMovement: Date.now(),
        lastMovingDirection: 'right',
        currentForce: 0,
        lastUpdate: Date.now()
      }
      movementData.set(entity, data)
    }
    return data
  }

  protected getSettings(entity: Entity): Required<MovementSettings> {
    return {
      ...DEFAULT_MOVEMENT_SETTINGS,
      ...(entity.plugins.get(this.name) as MovementSettings)
    }
  }

  protected setDirection(entity: Entity, direction: IPointData) {
    const data = this.getMovementData(entity)
    const settings = this.getSettings(entity)
    const prevDirection = { ...data.direction }

    // Normalize direction vector to ensure consistent force application
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y)
    if (length > 0) {
      direction = {
        x: direction.x / length,
        y: direction.y / length
      }
    }

    // Reset force to minimum when changing direction significantly
    if (settings.acceleration.enabled) {
      const dotProduct = (prevDirection.x * direction.x + prevDirection.y * direction.y)
      // If direction change is more than ~90 degrees, reset force
      if (length > 0 && (dotProduct < 0.1 || prevDirection.x === 0 && prevDirection.y === 0)) {
        data.currentForce = settings.acceleration.minForce
      }
    }

    data.direction = direction
    data.lastInput = Date.now()
  }

  protected applyMovement(entity: Entity) {
    const data = this.getMovementData(entity)
    const settings = this.getSettings(entity)
    const now = Date.now()
    const deltaTime = (now - data.lastUpdate) / 1000 // Convert to seconds
    const velocity = entity.velocity
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)

    if (data.direction.x === 0 && data.direction.y === 0) {
      // Handle deceleration when no input
      if (settings.acceleration.enabled && speed > 0) {
        // Calculate deceleration force
        const decelerationForce = settings.acceleration.deceleration * deltaTime

        // // Apply opposing force in direction of current velocity
        // if (speed > 0) {
        //   const opposingForce = {
        //     x: -(velocity.x / speed) * decelerationForce,
        //     y: -(velocity.y / speed) * decelerationForce
        //   }
        //   Body.applyForce(entity.body, entity.body.position, opposingForce)
        // }

        // Update force for animation state
        data.currentForce = Math.max(
          settings.acceleration.minForce,
          data.currentForce - settings.acceleration.deceleration * deltaTime
        )
      }
      data.lastUpdate = now
      return
    }

    // Handle acceleration
    if (settings.acceleration.enabled) {
      data.currentForce = Math.min(
        settings.force,
        data.currentForce + settings.acceleration.rate * deltaTime
      )
    } else {
      data.currentForce = settings.force
    }
    data.lastUpdate = now

    // Apply force in direction
    const force = {
      x: data.direction.x * data.currentForce,
      y: data.direction.y * data.currentForce
    }

    Body.applyForce(entity.body, entity.body.position, force)

    // Apply speed limit
    if (speed > settings.maxSpeed) {
      const scale = settings.maxSpeed / speed
      Body.setVelocity(entity.body, {
        x: velocity.x * scale,
        y: velocity.y * scale
      })
    }
  }

  protected getVelocityDirection(velocity: IPointData): Direction {
    const absX = Math.abs(velocity.x)
    const absY = Math.abs(velocity.y)

    if (absX > absY) {
      return velocity.x > 0 ? 'right' : 'left'
    }
    return velocity.y > 0 ? 'down' : 'up'
  }

  protected updateMovementState(entity: Entity): { state: MovementState, direction: Direction } {
    const data = this.getMovementData(entity)
    const settings = this.getSettings(entity)
    const now = Date.now()
    const velocity = entity.velocity
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
    const hasInput = Math.abs(data.direction.x) > 0 || Math.abs(data.direction.y) > 0
    const timeSinceInput = now - data.lastInput

    // Get current direction from velocity
    const currentDirection = speed > settings.velocityThreshold
      ? this.getVelocityDirection(velocity)
      : data.lastMovingDirection

    // Store last moving direction when we have significant velocity
    if (speed > settings.velocityThreshold) {
      data.lastMovingDirection = currentDirection
    }

    // Determine next state
    let nextState = data.state

    if (hasInput) {
      // When input is active, handle acceleration and movement
      if (settings.acceleration.enabled) {
        if (data.state !== 'moving' && data.currentForce < settings.force * 0.8) {
          nextState = 'accelerating' // Stay in accelerating until we reach threshold
        } else if (speed >= settings.velocityThreshold) {
          nextState = 'moving' // Once we transition to moving, stay there while input active
        }
      } else if (speed >= settings.velocityThreshold) {
        nextState = 'moving'
      }
      data.lastMovement = now
    } else if (timeSinceInput > settings.inputTimeout) {
      if (speed > settings.stoppingThreshold) {
        nextState = 'stopping' // Only use stopping animation when actually stopping
      } else if (speed <= settings.velocityThreshold) {
        const timeSinceMovement = now - data.lastMovement
        if (data.state !== 'stopped' && data.state !== 'idle') {
          nextState = 'stopped'
          data.lastMovement = now
        } else if (data.state === 'stopped' && timeSinceMovement >= settings.idleDelay) {
          nextState = 'idle'
        }
      }
    }

    // Prevent rapid state changes
    if (nextState !== data.state) {
      data.lastMovement = now
    }

    return { state: nextState, direction: currentDirection }
  }

  protected updateAnimation(entity: Entity) {
    const data = this.getMovementData(entity)
    const { state: nextState, direction } = this.updateMovementState(entity)

    // Get current animation base and direction
    const currentBase = data.currentAnimation?.replace(/Right|Left|Up|Down/, '') as Animations
    const currentDir = data.currentAnimation?.match(/Right|Left|Up|Down/)?.[0].toLowerCase() as Direction | undefined

    // Determine if we need to update the animation
    const stateChanged = nextState !== data.state
    const directionChanged = direction !== currentDir
    const needsUpdate = stateChanged || directionChanged

    if (!needsUpdate) return

    // Map movement state to animation
    const baseAnim = nextState === 'accelerating' ? Animations.accelerating
      : nextState === 'moving' ? Animations.moving
        : nextState === 'stopping' ? Animations.stopping
          : nextState === 'stopped' ? Animations.stopped
            : Animations.idle

    this.tryPlayAnimation(entity, baseAnim, direction)
    data.state = nextState
    data.lastMovingDirection = direction
  }

  protected tryPlayAnimation(entity: Entity, baseAnim: Animations, direction: Direction) {
    const data = this.getMovementData(entity)
    const dir = direction.charAt(0).toUpperCase() + direction.slice(1)
    const directionalAnim = `${baseAnim}${dir}` as Animations
    const oppositeAnim = direction === 'left'
      ? `${baseAnim}Right` as Animations
      : direction === 'right'
        ? `${baseAnim}Left` as Animations
        : undefined

    // Only update animation if it's actually different
    const newAnim = entity.hasAnimation(directionalAnim) ? directionalAnim
      : oppositeAnim && entity.hasAnimation(oppositeAnim) ? oppositeAnim
        : entity.hasAnimation(baseAnim) ? baseAnim
          : undefined

    if (!newAnim || newAnim === data.currentAnimation) {
      return
    }

    // Update animation and scale
    entity.playAnimation(newAnim)
    if (newAnim === oppositeAnim) {
      entity.setScale({ x: direction === 'left' ? -1 : 1, y: 1 })
    } else {
      entity.setScale({ x: 1, y: 1 })
    }
    data.currentAnimation = newAnim
  }

  update(entity: Entity) {
    this.applyMovement(entity)
    this.updateAnimation(entity)
  }
}