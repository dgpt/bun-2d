import { Container } from 'pixi.js'
import { Events, emit } from './events'
import { getState } from './Game'

export enum Scenes {
  main = 'main',
  menu = 'menu'
}

type SceneName = Scenes | string
type SceneStage = (container: Container) => void | Promise<void>

const scenes = new Map<SceneName, Scene>()
let currentScene: Scene | null = null

export default class Scene {
  private container: Container

  constructor(
    readonly name: SceneName,
    private stage: SceneStage
  ) {
    this.container = new Container()
    scenes.set(name, this)
  }

  async init(): Promise<void> {
    const { app } = getState()
    app.stage.addChild(this.container)
    await this.stage(this.container)
  }

  cleanup(): void {
    emit(Events.cleanup)
    const { app } = getState()
    app.stage.removeChild(this.container)
    this.container.destroy()
  }
}

export const setScene = async (name: SceneName): Promise<void> => {
  const scene = scenes.get(name)
  if (!scene) throw new Error(`Scene ${name} not found`)

  if (currentScene) {
    currentScene.cleanup()
  }

  currentScene = scene
  await scene.init()
}