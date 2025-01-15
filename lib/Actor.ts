import type { IPointData } from 'pixi.js'
import { Events } from './events'
import { Keys } from './keys'
import { Body, Vector } from 'matter-js'
import { Entity } from './Entity'
import { Animations } from './animations'

// Physics values optimized for smooth top-down movement
const MOVE_SPEED = 0.101 // Force to apply for movement
const SPEED_LIMIT = 5    // Max velocity
const PLAYER_PHYSICS = {
  friction: 0.05,      // Low friction for smooth movement
  frictionAir: 0.2,    // Higher air resistance for quick stops
  density: 0.001,      // Very light for responsive movement
  inertia: Infinity,   // Prevent rotation
  restitution: 0.0,    // No bounce for precise control
  isStatic: false      // Ensure body is not static
}

export class Actor extends Entity {
  private moveTarget = { x: 0, y: 0, active: false }
  private keys = new Set<Keys>()
  private speed: number
  private isDestroyed = false

  constructor(textureNameOrNames: string | string[], options: {
    speed?: number
    useKeyboard?: boolean
    physics?: Partial<typeof PLAYER_PHYSICS>
  } = {}) {
    // Pass physics options to Entity constructor
    super(textureNameOrNames, {
      physics: {
        ...PLAYER_PHYSICS,
        ...options.physics
      }
    })

    this.speed = options.speed ?? MOVE_SPEED

    // Setup keyboard controls if enabled
    if (options.useKeyboard) {
      this.on(Events.keyDown, (event?: KeyboardEvent) => {
        if (event && !this.isDestroyed) {
          // Convert key to enum value
          const key = event.key.toLowerCase() as Keys
          if (key in Keys) {
            this.keys.add(key)
          }
        }
      }).on(Events.keyUp, (event?: KeyboardEvent) => {
        if (event && !this.isDestroyed) {
          const key = event.key.toLowerCase() as Keys
          if (key in Keys) {
            this.keys.delete(key)
          }
        }
      })
    }
  }

  private limitVelocity(): void {
    const velocity = this.body.velocity
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
    if (speed > SPEED_LIMIT) {
      const scale = SPEED_LIMIT / speed
      Body.setVelocity(this.body, {
        x: velocity.x * scale,
        y: velocity.y * scale
      })
    }
  }

  private applyMovementForce(dx: number, dy: number): void {
    // Normalize the direction vector
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length === 0) return

    const normalizedDx = dx / length
    const normalizedDy = dy / length

    // Apply force in the normalized direction
    const force = Vector.create(
      normalizedDx * this.speed,
      normalizedDy * this.speed
    )
    Body.applyForce(this.body, this.body.position, force)
    this.limitVelocity()
  }

  update(): void {
    if (this.isDestroyed) return

    super.update()

    // Handle keyboard movement
    if (this.keys.size > 0) {
      let dx = 0
      let dy = 0

      if (this.keys.has(Keys.W) || this.keys.has(Keys.ArrowUp)) dy -= 1
      if (this.keys.has(Keys.S) || this.keys.has(Keys.ArrowDown)) dy += 1
      if (this.keys.has(Keys.A) || this.keys.has(Keys.ArrowLeft)) dx -= 1
      if (this.keys.has(Keys.D) || this.keys.has(Keys.ArrowRight)) dx += 1

      if (dx !== 0 || dy !== 0) {
        this.moveTarget.active = false // Cancel pointer movement when using keyboard
        this.applyMovementForce(dx, dy)
        this.playAnimation(Animations.moving)
      } else {
        this.playAnimation(Animations.idle)
      }
    }

    // Handle pointer movement
    if (this.moveTarget.active) {
      const dx = this.moveTarget.x - this.body.position.x
      const dy = this.moveTarget.y - this.body.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 1) {
        this.moveTarget.active = false
        Body.setVelocity(this.body, { x: 0, y: 0 })
        this.playAnimation(Animations.stopped)
      } else {
        this.applyMovementForce(dx, dy)
        this.playAnimation(Animations.moving)
      }
    }

    // Check if we should play idle animation
    if (!this.moveTarget.active && this.keys.size === 0) {
      const speed = Math.sqrt(
        this.body.velocity.x * this.body.velocity.x +
        this.body.velocity.y * this.body.velocity.y
      )
      if (speed < 0.1) {
        this.playAnimation(Animations.idle)
      }
    }
  }

  moveTo(target: IPointData): void {
    if (this.isDestroyed) return
    this.moveTarget.x = target.x
    this.moveTarget.y = target.y
    this.moveTarget.active = true
    this.playAnimation(Animations.accelerating)
  }

  destroy(): void {
    this.isDestroyed = true
    super.destroy()
  }
}