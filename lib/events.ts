import type { Entity } from './Entity'
import { getState } from './Game'
import { Layers } from './Layers'
import { Events as MatterEvents, Engine, IEventCollision, ICallback } from 'matter-js'

// Event type definitions
export type CollisionEvent = {
  a: Entity
  b: Entity
}

declare global {
  // Event data type definitions
  interface EventData {
// System events
    cleanup: void
    sceneChange: string
    pauseChange: boolean

  // DOM events
    keyDown: KeyboardEvent
    keyUp: KeyboardEvent
    resize: UIEvent

  // PIXI events
    pointerTap: { x: number, y: number }
    pointerDown: { x: number, y: number }
    pointerUp: { x: number, y: number }
    pointerMove: { x: number, y: number }

  // Matter.js events
    collisionStart: IEventCollision<Engine>
    collisionActive: IEventCollision<Engine>
    collisionEnd: IEventCollision<Engine>

  // Game events
    dialogOpen: void
    dialogClose: void
    collision: CollisionEvent
    animation: { type: string }
    entityLayerAdded: { entity: Entity, layer: Layers }
    entityLayerRemoved: { entity: Entity, layer: Layers }
  }

  // Base events namespace that acts like an enum
  namespace Events {
    // System events
    export const cleanup = 'cleanup'
    export const sceneChange = 'sceneChange'
    export const pauseChange = 'pauseChange'

    // DOM events
    export const keyDown = 'keyDown'
    export const keyUp = 'keyUp'
    export const resize = 'resize'

    // PIXI events
    export const pointerTap = 'pointerTap'
    export const pointerDown = 'pointerDown'
    export const pointerUp = 'pointerUp'
    export const pointerMove = 'pointerMove'

    // Matter.js events
    export const collisionStart = 'collisionStart'
    export const collisionActive = 'collisionActive'
    export const collisionEnd = 'collisionEnd'

    // Game events
    export const dialogOpen = 'dialogOpen'
    export const dialogClose = 'dialogClose'
    export const collision = 'collision'
    export const animation = 'animation'
    export const entityLayerAdded = 'entityLayerAdded'
    export const entityLayerRemoved = 'entityLayerRemoved'
  }
}

export { Events }

// Maximum call stack depth to prevent infinite loops
const MAX_CALL_DEPTH = 50
// Track current call depth
let currentCallDepth = 0
// Track recent events to detect cycles (eventType -> timestamp)
const recentEvents = new Map<string, number>()
// Minimum time between same events (ms)
const MIN_EVENT_INTERVAL = 16 // ~1 frame at 60fps

// Type for any event name (known or custom)

// PIXI events that should use PIXI's event system
const PIXI_EVENTS = new Set([
  Events.pointerTap,
  Events.pointerDown,
  Events.pointerUp,
  Events.pointerMove
])

// Matter.js events that should use Matter's event system
const MATTER_EVENTS = new Set([
  Events.collisionStart,
  Events.collisionActive,
  Events.collisionEnd
])

export const isPixiEvent = (event: keyof EventData): boolean => {
  return PIXI_EVENTS.has(event)
}

export const isMatterEvent = (event: keyof EventData): boolean => {
  return MATTER_EVENTS.has(event)
}

export type EventHandler<E extends keyof EventData> = (
  event: CustomEvent<EventData[E]>,
  data: EventData[E]
) => void

const checkEventThrottling = (event: string): boolean => {
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

export const emit = <E extends keyof EventData>(
  event: E,
  data?: EventData[E]
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
  } finally {
    currentCallDepth--
  }
}

export const on = <E extends keyof EventData>(
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
    const matterHandler = ((e: IEventCollision<Engine>) => {
      const customEvent = new CustomEvent(event, { detail: e }) as CustomEvent<EventData[E]>
      handler(customEvent, e as EventData[E])
    }) as ICallback<Engine>
    MatterEvents.on(engine, event, matterHandler)
    return () => MatterEvents.off(engine, event, matterHandler)
  }

  // For all other events
  const windowHandler = ((e: globalThis.Event) => {
    const customEvent = e as CustomEvent<EventData[E]>
    const data = customEvent.detail
    handler(customEvent, data as EventData[E])
  }) as EventListener

  window.addEventListener(event, windowHandler)
  return () => window.removeEventListener(event, windowHandler)
}

export default Events