import { Entity, type EntityOptions } from 'lib/Entity'
import { Movement, type MovementSettings } from 'lib/plugs/movement'

type ActorOptions = Omit<EntityOptions, 'plugins'> & {
  movement?: Movement
}

const DEFAULT_OPTIONS: ActorOptions = {
  movement: Movement.topDown
}

export class Actor extends Entity {
  constructor(textureNameOrNames: string | string[], options: ActorOptions = DEFAULT_OPTIONS) {
    super(textureNameOrNames, {
      ...options,
      plugins: {
        movement: {}
      }
    })

    // Initialize movement plugins based on selected type
    const movementType = options.movement ?? DEFAULT_OPTIONS.movement
    switch (movementType) {
      case Movement.topDown: {
        // Import and initialize top-down movement plugins
        const { keyboard, touch } = require('lib/plugs/movement/top-down')
        if (keyboard) this.use(keyboard)
        if (touch) this.use(touch)
        break
      }
      default:
        throw new Error(`Unknown movement type: ${movementType}`)
    }
  }
}