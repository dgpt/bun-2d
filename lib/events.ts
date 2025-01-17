import type { Entity } from './Entity'
import { getState } from './Game'
import type { Layer } from './Layers'
import { Events as MatterEvents, Body, Engine, IEventCollision, ICallback } from 'matter-js'

export enum Events {
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
  dialogOpen = 'dialog:open',
  dialogClose = 'dialog:close',
  collision = 'collision',
  animation = 'animation',
  entityLayerAdded = 'entity:layer:added',
  entityLayerRemoved = 'entity:layer:removed'
}

export type CollisionEvent = {
  a: Entity
  b: Entity
}

type EventDataType = 'on' | 'emit'

// Type for event data
export type EventData<T extends EventDataType = 'on'> = {
  [Events.keyDown]: KeyboardEvent
  [Events.keyUp]: KeyboardEvent
  [Events.resize]: UIEvent
  [Events.pointerTap]: { x: number, y: number }
  [Events.pointerDown]: { x: number, y: number }
  [Events.pointerUp]: { x: number, y: number }
  [Events.pointerMove]: { x: number, y: number }
  [Events.pauseChange]: boolean
  [Events.sceneChange]: string
  [Events.cleanup]: void
  [Events.dialogOpen]: void
  [Events.dialogClose]: void
  [Events.collision]: CollisionEvent
  [Events.animation]: { type: string }
  [Events.entityLayerAdded]: { entity: Entity, layer: Layer }
  [Events.entityLayerRemoved]: { entity: Entity, layer: Layer }
  [Events.collisionStart]: IEventCollision<Engine>
  [Events.collisionActive]: IEventCollision<Engine>
  [Events.collisionEnd]: IEventCollision<Engine>
}

// Type for any event name (known or custom)
export type EventName = Events | Layer | `${string}:${string}`

// PIXI events that should use PIXI's event system
const PIXI_EVENTS = new Set([
  'pointertap',
  'pointerdown',
  'pointerup',
  'pointermove',
  'pointerover',
  'pointerout',
  'pointerenter',
  'pointerleave'
])

// Matter.js events that should use Matter's event system
const MATTER_EVENTS = new Set([
  'collisionStart',
  'collisionActive',
  'collisionEnd',
  'beforeUpdate',
  'afterUpdate',
  'beforeRender',
  'afterRender'
])

export const isPixiEvent = (event: string): boolean => {
  return PIXI_EVENTS.has(event)
}

export const isMatterEvent = (event: string): boolean => {
  return MATTER_EVENTS.has(event)
}

export type EventHandler<E extends EventName> = (
  event: E extends keyof EventData
    ? EventData<'on'>[E]
    : E extends Layer
    ? Entity
    : Event,
  data?: E extends keyof EventData
    ? EventData<'on'>[E]
    : E extends Layer
    ? Entity
    : unknown
) => void

export const emit = <E extends EventName>(
  event: E,
  data?: E extends keyof EventData
    ? EventData<'emit'>[E]
    : E extends Layer
    ? CollisionEvent
    : unknown
): void => {
  if (isPixiEvent(event)) {
    // For PIXI pointer events, emit on the game container
    const { container } = getState()
    container.emit(event, data)
  } else if (isMatterEvent(event)) {
    // For Matter.js events, emit on the engine
    const { engine } = getState()
    MatterEvents.trigger(engine, event, data)
  } else {
    // For all other events, use the DOM event system
    const customEvent = new CustomEvent(event, { detail: data })
    window.dispatchEvent(customEvent)
  }
}

export const on = <E extends EventName>(
  event: E,
  handler: EventHandler<E>
): () => void => {
  if (isPixiEvent(event)) {
    // For PIXI pointer events, register on the game container
    const { container } = getState()
    container.on(event, handler)
    return () => container.off(event, handler)
  } else if (isMatterEvent(event)) {
    // For Matter.js events, register on the engine
    const { engine } = getState()
    MatterEvents.on(engine, event, handler as ICallback<Engine>)
    return () => MatterEvents.off(engine, event, handler)
  }

  // For all other events
  const wrappedHandler = (e: Event) => {
    const data = (e as CustomEvent).detail
    const eventArg = event in Events
      ? data as E extends keyof EventData ? EventData<'on'>[E] : never
      : event === 'entities'
        ? data as Entity
        : e as Event
    handler(eventArg as E extends keyof EventData ? EventData<'on'>[E] : E extends Layer ? Entity : Event, data)
  }
  window.addEventListener(event as string, wrappedHandler)
  return () => window.removeEventListener(event as string, wrappedHandler)
}