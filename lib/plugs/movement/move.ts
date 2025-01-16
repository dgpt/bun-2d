import type { Entity } from 'lib/Entity'
import type { IPointData } from 'pixi.js'
import { Body } from 'matter-js'
import { DEFAULT_MOVEMENT_SETTINGS, type MovementSettings } from './settings'

// Track movement state for each entity
const movement = new WeakMap<Entity, IPointData>()

export const getMovementDirection = (entity: Entity): IPointData => {
  return movement.get(entity) ?? { x: 0, y: 0 }
}

export const setMovementDirection = (entity: Entity, direction: IPointData): void => {
  const current = movement.get(entity)
  movement.set(entity, direction)
}

export const applyMovementForce = (entity: Entity, x: number, y: number): void => {
  // Get movement settings from the active plugin or use defaults
  const activePlugin = Array.from(entity.plugins.entries())
    .find(([key]) => key.endsWith('-top-down'))

  const settings = {
    ...DEFAULT_MOVEMENT_SETTINGS,
    ...(activePlugin?.[1] as MovementSettings | undefined)
  }

  const force = {
    x: x * settings.force,
    y: y * settings.force
  }

  // Apply force and limit speed if needed
  Body.applyForce(entity.body, entity.body.position, force)

  // Apply speed limit if set
  if (settings.maxSpeed) {
    const velocity = entity.velocity
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
    if (speed > settings.maxSpeed) {
      const scale = settings.maxSpeed / speed
      Body.setVelocity(entity.body, {
        x: velocity.x * scale,
        y: velocity.y * scale
      })
    }
  }
}

export const normalizeDirection = (direction: IPointData): IPointData => {
  const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y)
  if (length === 0) return direction

  return {
    x: direction.x / length,
    y: direction.y / length
  }
}
