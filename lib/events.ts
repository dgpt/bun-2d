import { FederatedPointerEvent } from 'pixi.js'
import type { Entity } from './Entity'
import { getState } from './Game'
import { Events as MatterEngineEvents, Engine, IEventCollision, ICallback, IEvent } from 'matter-js'
import { Keys } from './keys'

// Maximum call stack depth to prevent infinite loops
const MAX_CALL_DEPTH = 50
// Track current call depth
let currentCallDepth = 0
// Track recent events to detect cycles (eventType -> timestamp)
const recentEvents = new Map<string, number>()
// Minimum time between same events (ms)
const MIN_EVENT_INTERVAL = 16 // ~1 frame at 60fps

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

// DOM events that should use window event system
const KEYBOARD_EVENTS = new Set([
  Events.keyDown,
  Events.keyUp,
  Events.resize
])

// Event type guards
export const isPixiEvent = (event: Events): event is PixiEvents => {
  return PIXI_EVENTS.has(event)
}

export const isMatterEvent = (event: Events): event is MatterEvents => {
  return MATTER_EVENTS.has(event)
}

export const isKeyboardEvent = (event: Events): event is KeyboardEvents => {
  return KEYBOARD_EVENTS.has(event)
}

// Event type categories
type PixiEvents = Events.pointerTap | Events.pointerDown | Events.pointerUp | Events.pointerMove
type MatterEvents = Events.collisionStart | Events.collisionActive | Events.collisionEnd
type KeyboardEvents = Events.keyDown | Events.keyUp | Events.resize

// Event handler types for each category
type PixiEventHandler = (data: FederatedPointerEvent, event: FederatedPointerEvent) => void
type MatterEventHandler = (data: IEvent<Engine>, event: IEvent<Engine>) => void
type KeyboardEventHandler = (data: Keys, event: KeyboardEvent) => void
export type EventHandler<E extends Events> = E extends PixiEvents
  ? PixiEventHandler
  : E extends MatterEvents
  ? MatterEventHandler
  : E extends KeyboardEvents
  ? KeyboardEventHandler
  : (data: EventDataForEvent<E>, event: CustomEvent<EventDataForEvent<E>>) => void

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

export const emit = <E extends Events>(
  event: E,
  data?: EventDataForEvent<E>
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
      container.emit(event, data as FederatedPointerEvent)
    } else if (isMatterEvent(event)) {
      // For Matter.js events, emit on the engine
      const { engine } = getState()
      MatterEngineEvents.trigger(engine, event, data)
    } else {
      // For all other events, use the DOM event system
      const customEvent = new CustomEvent(event, { detail: data })
      window.dispatchEvent(customEvent)
    }
  } finally {
    currentCallDepth--
  }
}

export const on = <E extends Events>(
  event: E,
  handler: EventHandler<E>
): () => void => {
  if (isPixiEvent(event)) {
    // For PIXI pointer events, register on the game container
    const { container } = getState()
    const pixiHandler = ((e: FederatedPointerEvent) => {
      (handler as PixiEventHandler)(e, e)
    })
    container.on(event, pixiHandler)
    return () => container.off(event, pixiHandler)
  } else if (isMatterEvent(event)) {
    // For Matter.js events, register on the engine
    const { engine } = getState()
    const matterHandler = ((e: IEvent<Engine>) => {
      (handler as MatterEventHandler)(e, e)
    })
    MatterEngineEvents.on(engine, event, matterHandler)
    return () => MatterEngineEvents.off(engine, event, matterHandler)
  }

  // For DOM events, pass the original event
  if (isKeyboardEvent(event)) {
    const domEventHandler = (handler as KeyboardEventHandler)
    const domHandler = ((e: Event) => {
      if (e instanceof KeyboardEvent) {
        const keyEvent = e as KeyboardEvent
        domEventHandler(keyEvent.key as Keys, keyEvent)
      }
    }) as EventListener
    window.addEventListener(event, domHandler)
    return () => window.removeEventListener(event, domHandler)
  }

  // For all other events
  const windowHandler = ((e: globalThis.Event) => {
    const customEvent = e as CustomEvent<EventDataForEvent<E>>
    const eventData = customEvent.detail
    const customHandler = handler as (data: EventDataForEvent<E>, event: CustomEvent<EventDataForEvent<E>>) => void
    customHandler(eventData, customEvent)
  }) as EventListener

  window.addEventListener(event, windowHandler)
  return () => window.removeEventListener(event, windowHandler)
}