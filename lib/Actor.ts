import { Entity, type EntityOptions } from 'lib/Entity'
import { Movement, type MovementSettings } from 'lib/plugs/movement'

type ActorOptions = Partial<Omit<EntityOptions, 'plugins'> & {
  movement?: Movement
  plugins?: EntityOptions['plugins']
}>

const DEFAULT_OPTIONS = {
  movement: Movement.topDown
}

export class Actor extends Entity {
  public name = 'Actor'
  constructor(textureNameOrNames: string | string[], options: ActorOptions = {}) {
    // Pass through all options including plugin settings
    super(textureNameOrNames, options)

    // Initialize movement plugins based on selected type
    const movementType = options.movement ?? DEFAULT_OPTIONS.movement
    void this.initMovement(movementType)
  }

  private async initMovement(movementType: Movement): Promise<void> {
    switch (movementType) {
      case Movement.topDown: {
        // Import and initialize top-down movement plugins
        const { keyboard, touch } = await import('lib/plugs/movement/top-down')
        if (keyboard) this.use(keyboard)
        if (touch) this.use(touch)
        break
      }
      default:
        throw new Error(`Unknown movement type: ${movementType}`)
    }
  }
}