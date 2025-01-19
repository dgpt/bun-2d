// these are all global because there is no import/export in this file (apparently that's a thing)
// these are global because we need to support extending these enums and the only way that works is through global enums

// System-defined animations enum
enum Animations {
  // System events
  moving = 'moving',
  stopping = 'stopping',
  stopped = 'stopped',
  idle = 'idle',
  accelerating = 'accelerating',
  collision = 'collision',

  // Directional variants
  movingUp = 'movingUp',
  movingDown = 'movingDown',
  movingLeft = 'movingLeft',
  movingRight = 'movingRight',

  stoppingUp = 'stoppingUp',
  stoppingDown = 'stoppingDown',
  stoppingLeft = 'stoppingLeft',
  stoppingRight = 'stoppingRight',

  stoppedUp = 'stoppedUp',
  stoppedDown = 'stoppedDown',
  stoppedLeft = 'stoppedLeft',
  stoppedRight = 'stoppedRight',

  idleUp = 'idleUp',
  idleDown = 'idleDown',
  idleLeft = 'idleLeft',
  idleRight = 'idleRight',

  acceleratingUp = 'acceleratingUp',
  acceleratingDown = 'acceleratingDown',
  acceleratingLeft = 'acceleratingLeft',
  acceleratingRight = 'acceleratingRight',

  collisionUp = 'collisionUp',
  collisionDown = 'collisionDown',
  collisionLeft = 'collisionLeft',
  collisionRight = 'collisionRight'
}

// Base events enum
enum Events {
  // System events
  cleanup = 'cleanup',
  sceneChange = 'sceneChange',
  pauseChange = 'pauseChange',

  // DOM events
  keyDown = 'keydown',
  keyUp = 'keyup',
  resize = 'resize',

  // PIXI events
  pointerTap = 'pointertap',
  pointerDown = 'pointerdown',
  pointerUp = 'pointerup',
  pointerMove = 'pointermove',

  // Matter.js events
  collisionStart = 'collisionStart',
  collisionActive = 'collisionActive',
  collisionEnd = 'collisionEnd',

  // Game events
  dialogOpen = 'dialogOpen',
  dialogClose = 'dialogClose',
  collision = 'collision',
  animation = 'animation',

  // Layers events
  entityAdded = 'entityAdded',
  entityRemoved = 'entityRemoved'
}

type EventNames = Events | string

// Core game layers enum
enum Layers {
  entities = 'entities'
}

interface Window {
  Animations: typeof Animations
  Events: typeof Events
  Layers: typeof Layers
}

interface EventData {
  [Events.cleanup]: void;
  [Events.sceneChange]: string;
  [Events.pauseChange]: boolean;
  [Events.keyDown]: KeyboardEvent;
  [Events.keyUp]: KeyboardEvent;
  [Events.resize]: UIEvent;
  [Events.pointerTap]: import('pixi.js').FederatedPointerEvent;
  [Events.pointerDown]: import('pixi.js').FederatedPointerEvent;
  [Events.pointerUp]: import('pixi.js').FederatedPointerEvent;
  [Events.pointerMove]: import('pixi.js').FederatedPointerEvent;
  [Events.collisionStart]: import('matter-js').IEventCollision<import('matter-js').Engine>;
  [Events.collisionActive]: import('matter-js').IEventCollision<import('matter-js').Engine>;
  [Events.collisionEnd]: import('matter-js').IEventCollision<import('matter-js').Engine>;
  [Events.dialogOpen]: void;
  [Events.dialogClose]: void;
  [Events.collision]: { a: import('./Entity').Entity; b: import('./Entity').Entity };
  [Events.animation]: { type: Animations };
  [Events.entityAdded]: import('./Entity').Entity;
  [Events.entityRemoved]: import('./Entity').Entity;
  [key: string]: unknown;
}

type EventDataForEvent<E extends Events | Layers> = E extends Layers
  ? import('./Entity').Entity
  : E extends keyof EventData
  ? EventData[E] : unknown

window.Animations = Animations
window.Events = Events
window.Layers = Layers