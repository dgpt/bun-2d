import { Application, Assets, type Texture } from 'pixi.js'
import { Engine, Runner, Events as MatterEvents } from 'matter-js'
import { Events, emit } from './events'
import { initCollisions } from './collisions'
import Layers, { type Layer } from './Layers'
import type { Entity } from './Entity'

export interface GameSettings {
  backgroundColor?: number | string
  antialias?: boolean
}

export interface LoadOptions {
  spritesheets?: string[]
}

type GameState = {
  app: Application
  container: Application['stage']
  engine: Engine
  runner: Runner
  textures: Record<string, Texture>
  animations: Record<string, Texture[]>
  isPaused: boolean
}

let state: GameState | null = null

export const getState = (): GameState => {
  if (!state) throw new Error('Game not initialized')
  return state
}

export class Game {
  constructor(settings: GameSettings = {}) {
    if (state) throw new Error('Game already initialized')

    // Create PIXI application
    const app = new Application({
      backgroundColor: settings.backgroundColor ?? "#a0a0a0",
      resizeTo: document.body,
      antialias: settings.antialias ?? true,
      eventMode: 'static',
      eventFeatures: {
        move: true,
        globalMove: true,
        click: true,
        wheel: true
      }
    })
    document.body.appendChild(app.view as HTMLCanvasElement)

    // Create physics engine
    const engine = Engine.create({
      gravity: { x: 0, y: 0 }
    })

    // Create physics runner
    const runner = Runner.create()

    // Store initial state
    state = {
      app,
      container: app.stage,
      engine,
      runner,
      textures: {},
      animations: {},
      isPaused: false
    }

    // Initialize collision detection
    initCollisions()

    // Setup game loop
    app.ticker.add(() => {
      if (!state || state.isPaused) return

      // Run physics engine step
      Engine.update(engine, app.ticker.deltaMS)

      // Update all entities
      for (const entity of Layers.entities.entities) {
        entity.update()
      }
    })

    // Listen for window resize
    window.addEventListener('resize', () => {
      emit(Events.resize, new UIEvent('resize'))
    })
  }

  async load(options: LoadOptions = {}): Promise<void> {
    const { textures, animations } = getState()

    if (options.spritesheets) {
      for (const path of options.spritesheets) {
        const sheet = await Assets.load(path)
        Object.assign(textures, sheet.textures)
        if (sheet.animations) {
          Object.assign(animations, sheet.animations)
        }
      }
    }
  }

  start(): void {
    const { runner, engine } = getState()
    Runner.run(runner, engine)
  }

  pause(): void {
    const state = getState()
    state.isPaused = true
    emit(Events.pauseChange, true)
  }

  resume(): void {
    const state = getState()
    state.isPaused = false
    emit(Events.pauseChange, false)
  }

  isPaused(): boolean {
    return getState().isPaused
  }

  togglePause(): void {
    const state = getState()
    state.isPaused = !state.isPaused
    emit(Events.pauseChange, state.isPaused)
  }
}

// Helper functions for entity management
export const addEntity = (entity: Entity): void => {
  const { container } = getState()
  container.addChild(entity)
  Layers.entities.entities.add(entity)
}

export const removeEntity = (entity: Entity, layer?: Layer): void => {
  const { container } = getState()
  container.removeChild(entity)
  if (layer) {
    Layers[layer].entities.remove(entity)
  } else {
    Layers.entities.entities.remove(entity)
  }
}
