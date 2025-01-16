import type { Entity } from 'lib/Entity'
import type { IPointData } from 'pixi.js'
import { Events } from 'lib/events'
import { emit } from 'lib/events'
import { Animations } from 'lib/animations'

// Default sprite direction (facing right)
export const DEFAULT_SPRITE_DIRECTION: IPointData = { x: 1, y: 0 }

// Animation types for different movement directions
const DIRECTIONAL_ANIMATIONS = {
  up: 'walk_up',
  down: 'walk_down',
  left: 'walk_side',
  right: 'walk_side'
} as const

export const getDirectionalAnimation = (
  baseType: string,
  direction: IPointData,
  spriteDir: IPointData = DEFAULT_SPRITE_DIRECTION
): { animation: string, mirror: boolean } => {
  // Determine primary direction
  const absX = Math.abs(direction.x)
  const absY = Math.abs(direction.y)
  let type: keyof typeof DIRECTIONAL_ANIMATIONS

  if (absX > absY) {
    type = direction.x > 0 ? 'right' : 'left'
  } else if (absY > absX) {
    type = direction.y > 0 ? 'down' : 'up'
  } else {
    // Default to sprite's natural direction
    type = spriteDir.y !== 0
      ? (spriteDir.y > 0 ? 'down' : 'up')
      : (spriteDir.x > 0 ? 'right' : 'left')
  }

  const animation = `${baseType}_${DIRECTIONAL_ANIMATIONS[type]}`
  const mirror = type === 'left'

  return { animation, mirror }
}

export const handleMovementAnimation = (
  entity: Entity,
  direction: IPointData,
  spriteDir: IPointData = DEFAULT_SPRITE_DIRECTION
): void => {
  const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y)

  if (length === 0) {
    emit(Events.animation, { type: Animations.idle })
    return
  }

  const { animation, mirror } = getDirectionalAnimation('walk', direction, spriteDir)
  emit(Events.animation, { type: animation as Animations })
  entity.sprite.scale.x = mirror ? -1 : 1
}
