import { Entity, type EntityOptions } from '../Entity'
import type { IBodyDefinition } from 'matter-js'
import { Movement } from './movement'
import { topDown } from './keyboard/top-down'
import { path } from './touch/path'

// Default physics values optimized for top-down 2D game
const DEFAULT_PHYSICS: IBodyDefinition = {
  friction: 0.1,
  frictionAir: 0.4,
  density: 0.001,
  inertia: Infinity
}

type ActorOptions = EntityOptions & {
  movement?: Movement[]
}

const DEFAULT_MOVEMENT = [Movement.keyboardTopDown, Movement.touchPath]

export class Actor extends Entity {
  constructor(textureNameOrNames: string | string[], { movement = DEFAULT_MOVEMENT, physics = DEFAULT_PHYSICS, ...options }: ActorOptions = {}) {
    super(textureNameOrNames, { ...options, physics })

    // Apply movement plugins
    if (!movement.length) throw new Error('No movement plugins provided')
    for (const type of movement) {
      switch (type) {
        case Movement.keyboardTopDown:
          this.use(topDown)
          break
        case Movement.touchPath:
          this.use(path)
          break
      }
    }
  }
}