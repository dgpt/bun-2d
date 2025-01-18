import type { Entity } from './Entity'

export interface PluginSettings {
  [key: string]: unknown
}

export type PluginEvents = {
  [K in keyof EventData]?: (entity: Entity, ...args: any[]) => void
}

export type PluginInit<T> = (entity: Entity, settings?: T) => void
export type PluginUpdate = (entity: Entity) => void

export class Plugin<Settings = unknown> {
  public readonly name: string
  public readonly events?: PluginEvents

  constructor(name: string, {
    events,
    update,
    init
  }: {
    events?: PluginEvents
      update?: PluginUpdate
      init?: PluginInit<Settings>
  }) {
    this.name = name
    this.events = events
    this.update = update?.bind(this)
    if (init) {
      this.init = init.bind(this)
    }
  }

  init?(entity: Entity, settings?: Settings): void

  update?(entity: Entity): void

  // Helper to get plugin settings from entity
  protected getSettings(entity: Entity): Settings | undefined {
    return entity.plugins.get(this.name) as Settings | undefined
  }
}