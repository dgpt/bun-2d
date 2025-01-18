import type { Entity } from './Entity'
import { on, emit } from './events'

// Layer type definitions
declare global {
  // Base layers namespace that acts like an enum
  enum Layers {
    // Core game layers
    entities = 'entities'
  }

  namespace Layers {
    // Layer management functions
    export function add(layer: Layers, entity: Entity): void
    export function remove(layer: Layers, entity: Entity): void
    export function has(layer: Layers, entity: Entity): boolean
    export function get(layer: Layers): Entity[]
    export function listen(layer: Layers, entity: Entity): void
  }
}

// Internal storage for layer entities
const layerEntities = new Map<Layers, Entity[]>()

// Initialize core layers
Object.keys(Layers).forEach(layer => {
  if (typeof Layers[layer as keyof typeof Layers] === 'string') {
    layerEntities.set(layer as Layers, [])
  }
})

// Layer management implementation
Layers.add = (layer: Layers, entity: Entity) => {
  const entities = layerEntities.get(layer)
  if (!entities) {
    layerEntities.set(layer, [entity])
  } else {
    entities.push(entity)
  }
}

Layers.remove = (layer: Layers, entity: Entity) => {
  const entities = layerEntities.get(layer)
  entities?.splice(entities.indexOf(entity), 1)
}

Layers.has = (layer: Layers, entity: Entity): boolean => {
  return layerEntities.get(layer)?.includes(entity) ?? false
}

Layers.get = (layer: Layers): Entity[] => {
  return layerEntities.get(layer) ?? []
}

Layers.listen = (layer: Layers, entity: Entity): void => {
  // Listen for Matter.js collision events through our event system
  entity.gc(
    on(Events.collisionStart, (_, { pairs }) => {
      // Handle each collision pair
      pairs.forEach((pair) => {
        // Extract entities from Matter.js bodies
        const a = pair.bodyA.plugin?.entity as Entity | undefined
        const b = pair.bodyB.plugin?.entity as Entity | undefined

        if (!a || !b) return
        if (a.id !== entity.id && b.id !== entity.id) return

        const other = a.id === entity.id ? b : a
        const targetLayer = a.layers.find(l => l === layer)

        if (!targetLayer) return
        other.emit(targetLayer, entity)
      })
    }),
  )
}

export { Layers }
export default Layers
