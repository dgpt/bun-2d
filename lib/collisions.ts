import { Events, on, emit } from './events'
import Layers from './Layers'
import type { Entity } from './Entity'

export const initCollisions = (): void => {
  // Listen for Matter.js collision events through our event system
  on(Events.collisionStart, (_, { pairs }) => {
    // Handle each collision pair
    pairs.forEach((pair) => {
      // Extract entities from Matter.js bodies
      const a = pair.bodyA.plugin?.entity as Entity | undefined
      const b = pair.bodyB.plugin?.entity as Entity | undefined

      if (!a || !b) return

      // Emit general collision event
      emit(Events.collision, { a, b })

      // Emit layer-specific collision events for each layer of each entity
      a.layers.forEach(layer => {
        // If b is listening to this layer, emit the event
        if (Layers[layer]?.listeners.has(b)) {
          b.emit(layer, a)
        }
      })

      b.layers.forEach(layer => {
        // If a is listening to this layer, emit the event
        if (Layers[layer]?.listeners.has(a)) {
          a.emit(layer, b)
        }
      })
    })
  })
}