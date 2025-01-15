import type { Events } from './events'
import type { Entity } from './Entity'

export type PluginEvents = {
  [K in Events | string]?: (entity: Entity, ...args: any[]) => void
}

export class Plugin<Settings = void> {
  public readonly name: string
  public readonly events?: PluginEvents
  public readonly update?: (entity: Entity) => void
  public readonly init?: (entity: Entity, settings?: Settings) => void
  protected settings?: Settings

  constructor(name: string, {
    events,
    update,
    init
  }: {
    events?: PluginEvents
    update?: (entity: Entity) => void
    init?: (entity: Entity, settings?: Settings) => void
  }) {
    this.name = name
    this.events = events
    this.update = update
    this.init = init
  }
}
