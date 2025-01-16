import type { Entity } from './Entity'
import type { Animations } from './animations'
import type { IPointData } from 'pixi.js'
import { utils } from 'pixi.js'
import { getState } from './Game'
import type { Layer } from './Layers'

const { EventEmitter } = utils

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

  // Game events
  dialogOpen = 'dialog:open',
  dialogClose = 'dialog:close',
  collision = 'collision',
  animation = 'animation'
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
  [Events.collision]: T extends 'emit' ? CollisionEvent : Entity
  [Events.animation]: { type: Animations }
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

export const isPixiEvent = (event: string): boolean => {
  return PIXI_EVENTS.has(event)
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
    container.emit(event as any, data)
  } else {
    // For all other events, use the DOM event system
    const customEvent = new CustomEvent(event as string, { detail: data })
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
    container.on(event as any, handler as any)
    return () => container.off(event as any, handler as any)
  }

  // For all events
  const wrappedHandler = (e: Event) => {
    const data = (e as CustomEvent).detail
    handler(e as any, data)
  }
  window.addEventListener(event as string, wrappedHandler)
  return () => window.removeEventListener(event as string, wrappedHandler)
}
