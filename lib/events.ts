import type { Entity } from './Entity'
import type { Animations } from './animations'
import type { IPointData } from 'pixi.js'
import { utils } from 'pixi.js'

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

  // Touch events
  touchMove = 'touch:move',

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

// Type for event data
export type EventData = {
  [Events.keyDown]: KeyboardEvent
  [Events.keyUp]: KeyboardEvent
  [Events.resize]: UIEvent
  [Events.pointerTap]: { x: number, y: number }
  [Events.pointerDown]: { x: number, y: number }
  [Events.pointerUp]: { x: number, y: number }
  [Events.pointerMove]: { x: number, y: number }
  [Events.touchMove]: { x: number, y: number }
  [Events.pauseChange]: boolean
  [Events.sceneChange]: string
  [Events.cleanup]: void
  [Events.dialogOpen]: void
  [Events.dialogClose]: void
  [Events.collision]: CollisionEvent
  [Events.animation]: { type: Animations }
}

// Type for any event name (known or custom)
export type EventName = Events | string

// Type for event data based on event name
export type EventDataType<E extends EventName> = E extends keyof EventData
  ? EventData[E] extends void
    ? undefined
    : EventData[E]
  : E extends string
    ? CollisionEvent
    : never

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

// Global event emitter for PIXI events only
const pixiEmitter = new EventEmitter()

export type EventHandler<E extends EventName> = (
  event: Event,
  data: EventDataType<E>
) => void

export const emit = <E extends EventName>(
  event: E,
  data?: EventDataType<E> extends undefined ? never : EventDataType<E>
): void => {
  const eventName = event.toString()
  if (isPixiEvent(eventName)) {
    pixiEmitter.emit(eventName, data)
  } else {
    const customEvent = new CustomEvent(eventName, { detail: data })
    window.dispatchEvent(customEvent)
  }
}

export const on = <E extends EventName>(
  event: E,
  handler: EventHandler<E>
): () => void => {
  const eventName = event.toString()
  if (isPixiEvent(eventName)) {
    pixiEmitter.on(eventName, handler)
    return () => pixiEmitter.off(eventName, handler)
  }

  const wrappedHandler = (e: Event) => {
    const customEvent = e as CustomEvent<EventDataType<E>>
    handler(customEvent, customEvent.detail)
  }
  window.addEventListener(eventName, wrappedHandler)
  return () => window.removeEventListener(eventName, wrappedHandler)
}