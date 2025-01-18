import type { Entity } from './Entity'
import { emit } from './events'
import { Events } from './events'

// System-defined layers enum
export enum SystemLayers {
  Entities = 'entities'
}

// Type that combines system and user-defined layers
export type Layer = SystemLayers | GameLayers

// Layer operations interface
export interface LayerOps {
  add: (entity: Entity) => void
  remove: (entity: Entity) => void
  has: (entity: Entity) => boolean
  length: number
  name: string
  [Symbol.iterator](): Iterator<Entity>
}

type LayerOperations = {
  entities: LayerOps
  listeners: LayerOps
  listen: (entity: Entity) => () => void
}

type LayerInternals = {
  entities: Entity[]
  listeners: Entity[]
}

// Internal storage
const layers = new Map<Layer, LayerInternals>()

const findIndexByEntity = (arr: Entity[], entity: Entity) => arr.findIndex(e => e.id === entity.id)

const getLayer = (layerName: Layer): LayerOperations | null => {
  const layerData = layers.get(layerName)
  if (!layerData) {
    layers.set(layerName, {
      entities: [],
      listeners: []
    })
    return getLayer(layerName)
  }

  const createEntitySet = (arr: Entity[]): LayerOps => ({
    name: layerName,
    add: (entity: Entity) => {
      const idx = findIndexByEntity(arr, entity)
      if (idx === -1) {
        arr.push(entity)
        if (!entity.layers.has(layerName)) {
          entity.layers.add(layerName)
          emit(Events.entityLayerAdded, { entity, layer: layerName })
        }
      }
    },
    remove: (entity: Entity) => {
      const idx = findIndexByEntity(arr, entity)
      if (idx !== -1) {
        arr.splice(idx, 1)
        if (entity.layers.has(layerName)) {
          entity.layers.delete(layerName)
          emit(Events.entityLayerRemoved, { entity, layer: layerName })
        }
      }
    },
    has: (entity: Entity) => findIndexByEntity(arr, entity) !== -1,
    get length() {
      return arr.length
    },
    [Symbol.iterator]() {
      return arr[Symbol.iterator]()
    }
  })

  return {
    entities: createEntitySet(layerData.entities),
    listeners: createEntitySet(layerData.listeners),
    listen: (entity: Entity) => {
      const idx = findIndexByEntity(layerData.listeners, entity)
      if (idx === -1) {
        layerData.listeners.push(entity)
      }
      return () => {
        const idx = findIndexByEntity(layerData.listeners, entity)
        if (idx !== -1) {
          layerData.listeners.splice(idx, 1)
        }
      }
    }
  }
}

// Type for the Layers proxy
type LayersType = {
  [K in SystemLayers]: K
} & {
  [K in GameLayers]: K
} & LayerOperations

// Create the proxy with both instance and constructor functionality
const Layers = new Proxy({} as LayersType, {
  get(target: LayersType, prop: string | symbol) {
    return getLayer(prop as Layer)
  }
})

// Initialize system layers
Object.values(SystemLayers).forEach(layer => {
  if (!layers.has(layer)) {
    layers.set(layer, {
      entities: [],
      listeners: []
    })
  }
})

export default Layers