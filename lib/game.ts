import { Application, Assets, Container, Texture, Spritesheet } from 'pixi.js'
import { Engine, World } from 'matter-js'
import type { Entity } from './Entity'
import { Events, emit } from './events'
import { initCollisions } from './collisions'
import { Layers, getLayerEntities, addToLayer, removeFromLayer } from './layers'

type GameState = {
  app: Application
  engine: Matter.Engine
  container: Container
  textures: { [key: string]: Texture }
  animations: { [key: string]: Texture[] }
  isPaused: boolean
}

let state: GameState | null = null

export const isPaused = (): boolean => {
  if (!state) throw new Error('Game not initialized')
  return state.isPaused
}

export const togglePause = (): void => {
  if (!state) throw new Error('Game not initialized')
  state.isPaused = !state.isPaused
  emit(Events.pauseChange, state.isPaused)
}

export const init = async (): Promise<Application> => {
  const app = new Application({
    backgroundColor: "#a0a0a0",
    resizeTo: document.body,
    antialias: true
  })
  document.body.appendChild(app.view as HTMLCanvasElement)

  const engine = Engine.create({
    gravity: { x: 0, y: 0, scale: 0.001 }
  })

  // Initialize collision system
  initCollisions(engine)

  const container = new Container()
  app.stage.addChild(container)

  // Setup scene-wide click handling
  container.eventMode = 'static'
  container.hitArea = app.screen
  container.on('pointertap', (e) => {
    emit(Events.pointerTap, { x: e.global.x, y: e.global.y })
  })

  state = {
    app,
    engine,
    container,
    textures: {},
    animations: {},
    isPaused: false
  }

  app.ticker.add(() => {
    if (!state || state.isPaused) return

    // Run physics engine step
    Engine.update(state.engine, app.ticker.deltaMS)

    // Update all entities
    const entities = getLayerEntities(Layers.entities)
    entities.forEach(entity => {
      entity.update()
    })
  })

  return app
}

export const loadAssets = async (options: { spritesheets: string[] }): Promise<void> => {
  if (!state) throw new Error('Game not initialized')

  for (const path of options.spritesheets) {
    const sheet = await Assets.load<Spritesheet>(path)
    Object.assign(state.textures, sheet.textures)
    if (sheet.animations) {
      Object.assign(state.animations, sheet.animations)
    }
  }
}

export const getTexture = (name: string): Texture => {
  if (!state) throw new Error('Game not initialized')
  const texture = state.textures[name]
  if (!texture) throw new Error(`Texture ${name} not found`)
  return texture
}

export const getAnimation = (name: string): Texture[] => {
  if (!state) throw new Error('Game not initialized')
  const animation = state.animations[name]
  if (!animation) throw new Error(`Animation ${name} not found`)
  return animation
}

export const addChild = (entity: Entity): void => {
  if (!state) throw new Error('Game not initialized')

  // Add to display list
  state.container.addChild(entity)

  // Add to entities layer
  addToLayer(entity, Layers.entities)
}

export const removeChild = (entity: Entity): void => {
  if (!state) throw new Error('Game not initialized')

  // Remove from display list
  state.container.removeChild(entity)

  // Remove from entities layer
  removeFromLayer(entity, Layers.entities)
}

export const getState = (): GameState => {
  if (!state) throw new Error('Game not initialized')
  return state
}
