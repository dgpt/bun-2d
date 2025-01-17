// Base animation interface that can be extended by users
export interface IAnimations {
  // System animations
  moving: 'moving'
  stopping: 'stopping'
  stopped: 'stopped'
  idle: 'idle'
  accelerating: 'accelerating'
  collision: 'collision'

  // Directional variants
  movingUp: 'movingUp'
  movingDown: 'movingDown'
  movingLeft: 'movingLeft'
  movingRight: 'movingRight'

  stoppingUp: 'stoppingUp'
  stoppingDown: 'stoppingDown'
  stoppingLeft: 'stoppingLeft'
  stoppingRight: 'stoppingRight'

  stoppedUp: 'stoppedUp'
  stoppedDown: 'stoppedDown'
  stoppedLeft: 'stoppedLeft'
  stoppedRight: 'stoppedRight'

  idleUp: 'idleUp'
  idleDown: 'idleDown'
  idleLeft: 'idleLeft'
  idleRight: 'idleRight'

  acceleratingUp: 'acceleratingUp'
  acceleratingDown: 'acceleratingDown'
  acceleratingLeft: 'acceleratingLeft'
  acceleratingRight: 'acceleratingRight'

  collisionUp: 'collisionUp'
  collisionDown: 'collisionDown'
  collisionLeft: 'collisionLeft'
  collisionRight: 'collisionRight'
}

// Type for use in function parameters
export type Animation = IAnimations[keyof IAnimations]

// Internal storage
const animations: Set<Animation> = new Set([
  'moving',
  'stopping',
  'stopped',
  'idle',
  'accelerating',
  'collision',
  'movingUp',
  'movingDown',
  'movingLeft',
  'movingRight',
  'stoppingUp',
  'stoppingDown',
  'stoppingLeft',
  'stoppingRight',
  'stoppedUp',
  'stoppedDown',
  'stoppedLeft',
  'stoppedRight',
  'idleUp',
  'idleDown',
  'idleLeft',
  'idleRight',
  'acceleratingUp',
  'acceleratingDown',
  'acceleratingLeft',
  'acceleratingRight',
  'collisionUp',
  'collisionDown',
  'collisionLeft',
  'collisionRight',
])

// Base class to enable proper typing with Proxy
class BaseAnimations {
  constructor(input: Animation[] | Record<string, Animation> | Animation, ...rest: Animation[]) {
    const newAnimations = Array.isArray(input)
      ? input
      : typeof input === 'object' && input !== null
        ? Object.values(input)
        : [input, ...rest]

    newAnimations.forEach(anim => animations.add(anim))
  }
}

// Type for the Animations proxy
type AnimationsType = {
  new(input: Animation[] | Record<string, Animation> | Animation, ...rest: Animation[]): BaseAnimations
} & {
  [K in Animation]: K
}

// Create the proxy with both instance and constructor functionality
const Animations = new Proxy(BaseAnimations, {
  construct(target: typeof BaseAnimations, args: ConstructorParameters<typeof BaseAnimations>) {
    return new BaseAnimations(...args)
  },
  get(target: typeof BaseAnimations, prop: string | symbol) {
    if (typeof prop === 'string' && animations.has(prop as Animation)) {
      return prop
    }
    return undefined
  }
}) as AnimationsType

export default Animations