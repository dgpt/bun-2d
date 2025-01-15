import type { Entity } from '../Entity'
import type { IPointData } from 'pixi.js'
import { Body } from 'matter-js'
import { Animations } from '../animations'
import { Events, emit } from '../events'

// Movement types
export enum Movement {
  keyboardTopDown = 'keyboard-top-down',
  touchPath = 'touch-path'
}

// Movement settings type
export type MovementSettings = {
  spriteDirection?: IPointData
}

// Extend Entity's plugin settings
declare module '../Entity' {
  interface EntityPluginSettings {
    movement: MovementSettings
  }
}

// Default sprite direction (neutral)
export const DEFAULT_SPRITE_DIRECTION: IPointData = { x: 0, y: 0 }

// Movement constants
export const MOVE_FORCE = 0.01 // Force to apply for movement
export const MAX_VELOCITY = 5   // Maximum velocity magnitude
export const ARRIVAL_THRESHOLD = 5

// Helper to limit velocity
export const limitVelocity = (body: Body): void => {
  const velocity = body.velocity
  const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
  if (speed > MAX_VELOCITY) {
    const scale = MAX_VELOCITY / speed
    body.velocity.x *= scale
    body.velocity.y *= scale
  }
}

// Helper to calculate distance between points
export const distance = (a: IPointData, b: IPointData): number => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Helper to normalize direction vector
export const normalize = (dx: number, dy: number): IPointData => {
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length === 0) return { x: 0, y: 0 }
  return { x: dx / length, y: dy / length }
}

// Helper to apply movement force
export const applyMovementForce = (entity: Entity, dx: number, dy: number): void => {
  const force = { x: dx * MOVE_FORCE, y: dy * MOVE_FORCE }
  Body.applyForce(entity.body, entity.body.position, force)
  limitVelocity(entity.body)
}

// Helper to determine animation direction
export const getDirectionalAnimation = (
  baseType: Animations,
  dir: IPointData,
  spriteDir: IPointData = { x: 1, y: 1 }
): { animation?: Animations, mirror?: boolean } => {
  // Try specific directional animations first
  const dirX = Math.abs(dir.x) > Math.abs(dir.y)
  if (dirX) {
    const right = dir.x > 0
    const anim = `${baseType}Right` as Animations
    const leftAnim = `${baseType}Left` as Animations

    // Check if we have specific left/right animations
    if (Animations[anim] && Animations[leftAnim]) {
      return { animation: right ? anim : leftAnim }
    }

    // Fall back to x-axis animation with mirroring
    const xAnim = `${baseType}X` as Animations
    if (Animations[xAnim]) {
      const shouldMirror = (spriteDir.x > 0 && !right) || (spriteDir.x < 0 && right)
      return { animation: xAnim, mirror: shouldMirror }
    }
  } else {
    const down = dir.y > 0
    const anim = `${baseType}Down` as Animations
    const upAnim = `${baseType}Up` as Animations

    // Check if we have specific up/down animations
    if (Animations[anim] && Animations[upAnim]) {
      return { animation: down ? anim : upAnim }
    }

    // Fall back to y-axis animation with mirroring
    const yAnim = `${baseType}Y` as Animations
    if (Animations[yAnim]) {
      const shouldMirror = (spriteDir.y > 0 && down) || (spriteDir.y < 0 && !down)
      return { animation: yAnim, mirror: shouldMirror }
    }
  }

  // Emit base animation event if no directional animation found
  emit<Events.animation>(Events.animation, { type: baseType as unknown as Animations })
  return {}
}

// Helper to apply sprite mirroring
export const applyMirroring = (entity: Entity, mirror?: boolean): void => {
  if (mirror === undefined) return
  entity.sprite.scale.x = mirror ? -Math.abs(entity.sprite.scale.x) : Math.abs(entity.sprite.scale.x)
}

// Helper to handle movement animation
export const handleMovementAnimation = (
  entity: Entity,
  dir: IPointData,
  spriteDir?: IPointData
): void => {
  const speed = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
  const baseType = speed > 0 ? Animations.moving : Animations.idle

  const { animation, mirror } = getDirectionalAnimation(baseType, dir, spriteDir)
  if (animation) {
    // Emit the specific directional animation
    entity.emit<Events.animation>(Events.animation, { type: animation })
    applyMirroring(entity, mirror)
  } else {
    // Fall back to base animation if no directional variant exists
    entity.emit<Events.animation>(Events.animation, { type: baseType })
  }
}
