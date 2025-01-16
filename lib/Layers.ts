import type { Entity } from './Entity'

// Base layer interface that can be extended by users
export interface LayerTypes {
  entities: 'entities'
}

// Type for use in function parameters
export type Layer = LayerTypes[keyof LayerTypes]

type Entities = {
  add: (entity: Entity) => void
  remove: (entity: Entity) => void
  has: (entity: Entity) => boolean
  length: number
  [Symbol.iterator](): Iterator<Entity>
}

type LayerOperations = {
  entities: Entities
  listeners: Entities
  listen: (entity: Entity) => () => void
}

type LayerInternals = {
  entities: Entity[]
  listeners: Entity[]
}

// Internal storage
const layers: Partial<Record<Layer, LayerInternals>> = {}

const findIndexByEntity = (arr: Entity[], entity: Entity) => arr.findIndex(e => e.id === entity.id)
const getLayer = (layer: Layer): LayerOperations | null => {
  const layerData = layers[layer]
  if (!layerData) {
    return null
  }

  const createEntitySet = (arr: Entity[]): Entities => ({
    add: (entity: Entity) => {
      if (!arr.includes(entity)) {
        arr.push(entity)
      }
    },
    remove: (entity: Entity) => {
      const idx = arr.indexOf(entity)
      if (idx !== -1) {
        arr.splice(idx, 1)
      }
    },
    has: (entity: Entity) => arr.includes(entity),
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
      if (findIndexByEntity(layerData.listeners, entity) === -1) {
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

// using a class so we can use the constructor to add layers
// e.g. new Layers(Layer.A, Layer.B, Layer.C)
class BaseLayers {
  constructor(input: Layer[] | Record<string, Layer> | Layer, ...rest: Layer[]) {
    const newLayers = Array.isArray(input)
      ? input
      : typeof input === 'object'
        ? Object.values(input)
        : [input, ...rest]

    newLayers.forEach(layer => {
      layers[layer] = {
        entities: [],
        listeners: []
      }
    })
  }
}

// Type for the Layers proxy
type LayersType = {
  new(input: Layer[] | Record<string, Layer> | Layer, ...rest: Layer[]): BaseLayers
} & {
  [K in Layer]: LayerOperations
}

// Create the proxy with both instance and constructor functionality
const Layers = new Proxy(BaseLayers, {
  construct(target: typeof BaseLayers, args: ConstructorParameters<typeof BaseLayers>) {
    return new BaseLayers(...args)
  },
  get(target: typeof BaseLayers, prop: string | symbol) {
    return getLayer(prop as Layer)
  }
}) as LayersType

new Layers('entities')

export default Layers