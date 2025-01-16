import type { Entity } from 'lib/Entity'
import type { IPointData } from 'pixi.js'
import { Body } from 'matter-js'

// Default movement force
const MOVEMENT_FORCE = 0.001

// Track movement state for each entity
const movement = new WeakMap<Entity, IPointData>()

export const getMovementDirection = (entity: Entity): IPointData => {
  return movement.get(entity) ?? { x: 0, y: 0 }
}

export const setMovementDirection = (entity: Entity, direction: IPointData): void => {
  movement.set(entity, direction)
}

export const applyMovementForce = (entity: Entity, x: number, y: number): void => {
  const force = {
    x: x * MOVEMENT_FORCE,
    y: y * MOVEMENT_FORCE
  }
  Body.applyForce(entity.body, entity.body.position, force)
}

export const normalizeDirection = (direction: IPointData): IPointData => {
  const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y)
  if (length === 0) return direction

  return {
    x: direction.x / length,
    y: direction.y / length
  }
}
