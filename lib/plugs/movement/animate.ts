import type { Entity } from 'lib/Entity'
import type { IPointData } from 'pixi.js'
import { emit } from 'lib/events'

// Default sprite direction (facing right)
export const DEFAULT_SPRITE_DIRECTION: IPointData = { x: 1, y: 0 }

export const handleMovementAnimation = (
  entity: Entity,
  direction: IPointData
): void => {
  const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y)

  if (length === 0) {
    emit(Events.animation, { type: Animations.idle })
    return
  }

  // Determine primary direction
  const absX = Math.abs(direction.x)
  const absY = Math.abs(direction.y)

  if (absX > absY) {
    // Moving primarily horizontally
    emit(Events.animation, {
      type: direction.x > 0 ? Animations.movingRight : Animations.movingLeft
    })
    return
  }

  if (absY > absX) {
    // Moving primarily vertically
    emit(Events.animation, {
      type: direction.y > 0 ? Animations.movingDown : Animations.movingUp
    })
    return
  }

  // Default to idle if no clear direction
  emit(Events.animation, { type: Animations.idle })
}
