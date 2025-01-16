// Extended animation types for movement plugins
export enum Animations {
  // Basic animations
  moving = 'moving',
  stopping = 'stopping',
  stopped = 'stopped',
  idle = 'idle',
  accelerating = 'accelerating',
  collision = 'collision',

  // Directional variants
  movingX = 'movingX',
  movingY = 'movingY',
  movingUp = 'movingUp',
  movingDown = 'movingDown',
  movingLeft = 'movingLeft',
  movingRight = 'movingRight',

  stoppingX = 'stoppingX',
  stoppingY = 'stoppingY',
  stoppingUp = 'stoppingUp',
  stoppingDown = 'stoppingDown',
  stoppingLeft = 'stoppingLeft',
  stoppingRight = 'stoppingRight',

  stoppedX = 'stoppedX',
  stoppedY = 'stoppedY',
  stoppedUp = 'stoppedUp',
  stoppedDown = 'stoppedDown',
  stoppedLeft = 'stoppedLeft',
  stoppedRight = 'stoppedRight',

  idleX = 'idleX',
  idleY = 'idleY',
  idleUp = 'idleUp',
  idleDown = 'idleDown',
  idleLeft = 'idleLeft',
  idleRight = 'idleRight',

  acceleratingX = 'acceleratingX',
  acceleratingY = 'acceleratingY',
  acceleratingUp = 'acceleratingUp',
  acceleratingDown = 'acceleratingDown',
  acceleratingLeft = 'acceleratingLeft',
  acceleratingRight = 'acceleratingRight',

  collisionX = 'collisionX',
  collisionY = 'collisionY',
  collisionUp = 'collisionUp',
  collisionDown = 'collisionDown',
  collisionLeft = 'collisionLeft',
  collisionRight = 'collisionRight'
}