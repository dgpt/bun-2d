import { Events as MatterEvents, type Engine, type IEventCollision } from 'matter-js'
import type { Entity } from './Entity'
import { getLayerListeners } from './layers'
import { emit } from './events'

export const initCollisions = (engine: Engine): void => {
  // Listen for collision events
  MatterEvents.on(engine, 'collisionStart', (event: IEventCollision<Engine>) => {
    event.pairs.forEach(pair => {
      const entityA = pair.bodyA.plugin?.entity as Entity | undefined
      const entityB = pair.bodyB.plugin?.entity as Entity | undefined

      if (!entityA || !entityB) return

      // Get all registered layer listeners
      const layerListeners = getLayerListeners() as Map<string, Set<Entity>>

      // Only check layers that have registered listeners
      layerListeners.forEach((listeners, layer) => {
        // Only emit if there are listeners and at least one entity is in this layer
        if (listeners.size > 0 && (entityA.layers.has(layer) || entityB.layers.has(layer))) {
          emit(layer, { a: entityA, b: entityB })
        }
      })
    })
  })
}