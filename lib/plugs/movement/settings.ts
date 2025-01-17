import type { IPointData } from 'pixi.js'

export const DEFAULT_MOVEMENT_SETTINGS = {
  spriteDirection: { x: 1, y: 0 },
  force: 0.05,
  maxSpeed: 5,
  friction: 0.1
}

export type MovementSettings = {
  spriteDirection?: IPointData
  force?: number
  maxSpeed?: number
  friction?: number
}