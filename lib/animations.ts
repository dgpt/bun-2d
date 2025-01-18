// System-defined animations enum
export enum SystemAnimations {
  // System events
  Moving = 'moving',
  Stopping = 'stopping',
  Stopped = 'stopped',
  Idle = 'idle',
  Accelerating = 'accelerating',
  Collision = 'collision',

  // Directional variants
  MovingUp = 'movingUp',
  MovingDown = 'movingDown',
  MovingLeft = 'movingLeft',
  MovingRight = 'movingRight',

  StoppingUp = 'stoppingUp',
  StoppingDown = 'stoppingDown',
  StoppingLeft = 'stoppingLeft',
  StoppingRight = 'stoppingRight',

  StoppedUp = 'stoppedUp',
  StoppedDown = 'stoppedDown',
  StoppedLeft = 'stoppedLeft',
  StoppedRight = 'stoppedRight',

  IdleUp = 'idleUp',
  IdleDown = 'idleDown',
  IdleLeft = 'idleLeft',
  IdleRight = 'idleRight',

  AcceleratingUp = 'acceleratingUp',
  AcceleratingDown = 'acceleratingDown',
  AcceleratingLeft = 'acceleratingLeft',
  AcceleratingRight = 'acceleratingRight',

  CollisionUp = 'collisionUp',
  CollisionDown = 'collisionDown',
  CollisionLeft = 'collisionLeft',
  CollisionRight = 'collisionRight'
}

// Type that combines system and game-defined animations
export type Animation = SystemAnimations | GameAnimations

// Type for the Animations proxy
type AnimationsType = {
  [K in SystemAnimations]: K
} & {
  [K in GameAnimations]: K
}

// Create the proxy with both instance and constructor functionality
const Animations = new Proxy({} as AnimationsType, {
  get(target: AnimationsType, prop: string | symbol) {
    if (typeof prop === 'string') {
      // Check if it's a system or game animation
      if (Object.values(SystemAnimations).includes(prop as SystemAnimations) ||
        Object.values(GameAnimations).includes(prop as GameAnimations)) {
        return prop
      }
    }
    return undefined
  }
})

export default Animations