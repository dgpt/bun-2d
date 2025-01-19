import type { Entity } from 'lib/Entity'
import { on, emit } from 'lib/events'
import type { Pair, Engine, IEventCollision } from 'matter-js'
import 'lib/global'

// Internal storage for layer entities
const layerEntities = new Map<Layers, Entity[]>()

// Initialize core layers
Object.keys(Layers).forEach(layer => {
  if (typeof Layers[layer as keyof typeof Layers] === 'string') {
    layerEntities.set(layer as Layers, [])
  }
})

// Layer management implementation
export const add = (layer: Layers, entity: Entity) => {
  const entities = layerEntities.get(layer)
  if (!entities) {
    layerEntities.set(layer, [entity])
  } else {
    entities.push(entity)
  }
  emit(Events.entityAdded, entity)
}

export const remove = (layer: Layers, entity: Entity) => {
  const entities = layerEntities.get(layer)
  entities?.splice(entities.indexOf(entity), 1)
  emit(Events.entityRemoved, entity)
}

export const has = (layer: Layers, entity: Entity) => {
  return layerEntities.get(layer)?.includes(entity) ?? false
}

export const get = (layer: Layers) => {
  return layerEntities.get(layer) ?? []
}

export const listen = (layer: Layers, entity: Entity) => {
  // Listen for Matter.js collision events through our event system
  entity.gc(
    on(Events.collisionStart, (event) => {
      // Handle each collision pair
      const pairs = (event as IEventCollision<Engine>).pairs
      pairs.forEach((pair: Pair) => {
        // Extract entities from Matter.js bodies
        const a = pair.bodyA.plugin?.entity as Entity | undefined
        const b = pair.bodyB.plugin?.entity as Entity | undefined

        if (!a || !b) return
        if (a.id !== entity.id && b.id !== entity.id) return
        emit(Events.collision, { a, b })

        const other = a.id === entity.id ? b : a
        const targetLayer = a.layers.find(l => l === layer)

        if (!targetLayer) return
        other.emit(targetLayer, entity)
      })
    }),
  )
}

export default {
  add,
  remove,
  has,
  get,
  listen
}