import type { Entity } from './Entity'
import { getState } from './Game'
import type { Layer } from './Layers'
import { Events as MatterEvents, Engine, IEventCollision, ICallback } from 'matter-js'

// Base event interface that can be extended
enum Events {
  // System events
  cleanup = 'cleanup',
  sceneChange = 'sceneChange',
  pauseChange = 'pauseChange',

  // DOM events
  keyDown = 'keyDown',
  keyUp = 'keyUp',
  resize = 'resize',

  // PIXI events
  pointerTap = 'pointerTap',
  pointerDown = 'pointerDown',
  pointerUp = 'pointerUp',
  pointerMove = 'pointerMove',

  // Matter.js events
  collisionStart = 'collisionStart',
  collisionActive = 'collisionActive',
  collisionEnd = 'collisionEnd',

  // Game events
  dialogOpen = 'dialogOpen',
  dialogClose = 'dialogClose',
  collision = 'collision',
  animation = 'animation',
  entityLayerAdded = 'entityLayerAdded',
  entityLayerRemoved = 'entityLayerRemoved'
}

type EventData = {
  [Events.cleanup]: void;
  [Events.sceneChange]: string;
  [Events.pauseChange]: boolean;
  [Events.keyDown]: KeyboardEvent;
  [Events.keyUp]: KeyboardEvent;
  [Events.resize]: UIEvent;
  [Events.pointerTap]: { x: number, y: number };
  [Events.pointerDown]: { x: number, y: number };
  [Events.pointerUp]: { x: number, y: number };
  [Events.pointerMove]: { x: number, y: number };
  [Events.collisionStart]: IEventCollision<Engine>;
  [Events.collisionActive]: IEventCollision<Engine>;
  [Events.collisionEnd]: IEventCollision<Engine>;
  [Events.dialogOpen]: void;
  [Events.dialogClose]: void;
  [Events.collision]: CollisionEvent;
  [Events.animation]: { type: string };
  [Events.entityLayerAdded]: { entity: Entity, layer: Layer };
  [Events.entityLayerRemoved]: { entity: Entity, layer: Layer };
}

declare global {
  interface GameEvents extends Record<string, unknown> { }
}

export type Event = keyof Events | keyof GameEvents
type EventData<E extends Event> = E extends keyof Events ? Events[E] : GameEvents[E]

// Maximum call stack depth to prevent infinite loops
const MAX_CALL_DEPTH = 50
// Track current call depth
let currentCallDepth = 0
// Track recent events to detect cycles (eventType -> timestamp)
const recentEvents = new Map<Event, number>()
// Minimum time between same events (ms)
const MIN_EVENT_INTERVAL = 16 // ~1 frame at 60fps

export type CollisionEvent = {
  a: Entity
  b: Entity
}

// PIXI events that should use PIXI's event system
const PIXI_EVENTS = new Set<keyof Events>([
  'pointerTap',
  'pointerDown',
  'pointerUp',
  'pointerMove'
])

// Matter.js events that should use Matter's event system
const MATTER_EVENTS = new Set<keyof Events>([
  'collisionStart',
  'collisionActive',
  'collisionEnd'
])

export const isPixiEvent = (event: keyof Events): boolean => {
  return PIXI_EVENTS.has(event)
}

export const isMatterEvent = (event: keyof Events): boolean => {
  return MATTER_EVENTS.has(event)
}

export type EventHandler<E extends Event> = (
  event: CustomEvent<EventData<E>>,
  data: EventData<E>
) => void

const checkEventThrottling = (event: Event): boolean => {
  const now = Date.now()
  const lastEmit = recentEvents.get(event)

  if (lastEmit && now - lastEmit < MIN_EVENT_INTERVAL) {
    return false
  }

  recentEvents.set(event, now)
  // Cleanup old events
  if (recentEvents.size > 1000) {
    const cutoff = now - 1000 // Remove events older than 1s
    for (const [event, timestamp] of recentEvents.entries()) {
      if (timestamp < cutoff) {
        recentEvents.delete(event)
      }
    }
  }
  return true
}

// Create the proxy with both instance and constructor functionality
export const Events = new Proxy({} as Events & GameEvents, {
  get(target: Events & GameEvents, prop: string | symbol) {
    return target[prop as keyof typeof target]
  }
}) as Events & GameEvents

export const emit = <E extends Event>(
  event: E,
  data?: EventData<E>
): void => {
  try {
    // Check call depth
    if (currentCallDepth >= MAX_CALL_DEPTH) {
      console.warn(`Maximum event call depth (${MAX_CALL_DEPTH}) exceeded for event: ${event}`)
      return
    }

    // Check event throttling
    if (!checkEventThrottling(event)) {
      return
    }

    currentCallDepth++

    if (isPixiEvent(event as keyof Events)) {
      // For PIXI pointer events, emit on the game container
      const { container } = getState()
      container.emit(event as keyof Events, data)
    } else if (isMatterEvent(event as keyof Events)) {
      // For Matter.js events, emit on the engine
      const { engine } = getState()
      MatterEvents.trigger(engine, event as keyof Events, data)
    } else {
      // For all other events, use the DOM event system
      const customEvent = new CustomEvent(event as string, { detail: data })
      window.dispatchEvent(customEvent)
    }
  } finally {
    currentCallDepth--
  }
}

export const on = <E extends Event>(
  event: E,
  handler: (event: CustomEvent<typeof Events[E]>, data: typeof Events[E]) => void
): () => void => {
  if (isPixiEvent(event as keyof Events)) {
    // For PIXI pointer events, register on the game container
    const { container } = getState()
    container.on(event as keyof Events, handler)
    return () => container.off(event as keyof Events, handler)
  } else if (isMatterEvent(event as keyof Events)) {
    // For Matter.js events, register on the engine
    const { engine } = getState()
    const matterHandler = ((e: IEventCollision<Engine>) => {
      const customEvent = new CustomEvent(event as string, { detail: e }) as CustomEvent<typeof Events[E]>
      handler(customEvent, e as typeof Events[E])
    }) as ICallback<Engine>
    MatterEvents.on(engine, event as string, matterHandler)
    return () => MatterEvents.off(engine, event as string, matterHandler)
  }

  // For all other events
  const windowHandler = ((e: globalThis.Event) => {
    const customEvent = e as CustomEvent<typeof Events[E]>
    const data = customEvent.detail
    handler(customEvent, data as typeof Events[E])
  }) as EventListener

  window.addEventListener(event as string, windowHandler)
  return () => window.removeEventListener(event as string, windowHandler)
}

export default Events