import type { Entity } from 'lib/Entity'
import type { IPointData } from 'pixi.js'

export type Target = Entity | IPointData

export interface MovementSettings {
  force?: number
  maxSpeed?: number
}

export interface PathData {
  path: IPointData[]
  target?: Target
  destination: IPointData
  isRecalculating?: boolean
}