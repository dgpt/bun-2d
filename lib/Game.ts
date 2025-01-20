import 'lib/global'
import { Application, Assets, type Texture } from 'pixi.js'
import { Engine, Runner, Events as MatterEvents } from 'matter-js'
import { emit, on } from 'lib/events'
import { Entity } from 'lib/Entity'
import Layer from 'lib/layer'

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

    // Enable pointer events on the stage
    app.stage.eventMode = 'static'
    app.stage.hitArea = app.screen
    app.stage.interactiveChildren = true

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

    // Setup game loop
    app.ticker.add(() => {
      if (!state || state.isPaused) return

      // Run physics engine step
      Engine.update(engine, app.ticker.deltaMS)

      // Update all entities
      for (const entity of Layer.get(Layers.entities)) {
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
      // First, add all spritesheets to PIXI's asset loader
      for (const path of options.spritesheets) {
        await Assets.load(path)
      }

      // Now process each loaded spritesheet
      for (const path of options.spritesheets) {
        const sheet = await Assets.get(path)
        console.log('Loaded spritesheet:', path)

        // Add individual textures to our cache
        for (const [key, texture] of Object.entries(sheet.textures)) {
          textures[key] = texture as Texture
        }

      // Add animations to our cache
        if (sheet.animations) {
          // Store animations directly - they're already Texture arrays
          Object.assign(animations, sheet.animations)
        }
      }

      console.log('Final animations:', Object.fromEntries(
        Object.entries(animations).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])
      ))
      console.log('Final textures:', Object.keys(textures))
    }
  }

  isTextureLoaded(name: string): boolean {
    const { textures } = getState()
    return name in textures
  }

  getTexture(name: string): Texture | undefined {
    const { textures } = getState()
    return textures[name]
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

  // if you feel like using Game as a namespace
  static addEntity(entity: Entity): void {
    getState().container.addChild(entity)
    Layer.add(Layers.entities, entity)
  }

  static removeEntity(entity: Entity): void {
    getState().container.removeChild(entity)
    Layer.remove(Layers.entities, entity)
  }
}

// if you just want functions
export const addEntity = (entity: Entity): void => Game.addEntity(entity)
export const removeEntity = (entity: Entity): void => Game.removeEntity(entity)

export default Game