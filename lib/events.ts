import { utils } from 'pixi.js'
const { EventEmitter } = utils

export enum Events {
  cleanup = 'cleanup',
  sceneChange = 'sceneChange',
  keyDown = 'keydown',
  keyUp = 'keyup',
  resize = 'resize',
  pointerTap = 'pointertap',
  dialogOpen = 'dialog:open',
  dialogClose = 'dialog:close',
  pauseChange = 'pauseChange',
  collision = 'collision'
}

// Global event emitter for system-wide events (private)
const globalEmitter = new EventEmitter()

// Map of DOM events to their window event names
const DOM_EVENTS = new Set([
  'keydown',
  'keyup',
  'resize',
  'pointertap'
])

// Initialize DOM event listeners
if (typeof window !== 'undefined') {
  DOM_EVENTS.forEach(eventName => {
    window.addEventListener(eventName, ((e: Event) => {
      globalEmitter.emit(eventName, e)
    }) as EventListener)
  })
}

export const emit = (event: Events | string, data?: any): void => {
  globalEmitter.emit(event, data)
}

export const on = <T = any>(event: Events | string, fn: (data?: T) => void): () => void => {
  globalEmitter.on(event, fn)
  return () => globalEmitter.off(event, fn)
}