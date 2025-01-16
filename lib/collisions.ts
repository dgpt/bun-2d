import { Events, emit } from './events'
import Layers from './Layers'
import type { Entity } from './Entity'

export const initCollisions = (): void => {
  // Listen for collision events
  window.addEventListener('collisionstart', (e: Event) => {
    const { pairs } = (e as CustomEvent).detail

    // Handle each collision pair
    pairs.forEach((pair: { bodyA: { plugin: { entity: Entity } }, bodyB: { plugin: { entity: Entity } } }) => {
      const a = pair.bodyA.plugin.entity
      const b = pair.bodyB.plugin.entity

      // Emit collision event for each entity
      emit(Events.collision, { a, b })

      // Emit layer-specific collision events
      a.layers.forEach(layer => {
        if (b.layers.has(layer)) {
          emit(layer, { a, b })
        }
      })
    })
  })
}