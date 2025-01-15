import type { Entity } from './Entity'

// Engine-specific layers
export enum Layers {
  // Core layer
  entities = 'entities',    // All entities in the game
}

// Map of layer names to sets of entities
const layerEntities = new Map<string, Set<Entity>>()

// Track collision listeners by layer
const layerListeners = new Map<string, Set<Entity>>()

export const addToLayer = (entity: Entity, layer: string): void => {
  if (!layerEntities.has(layer)) {
    layerEntities.set(layer, new Set())
  }
  const entities = layerEntities.get(layer)!
  entities.add(entity)
  entity.layers.add(layer)
}

export const addToLayers = (entity: Entity, layers: string[]): void => {
  layers.forEach(layer => addToLayer(entity, layer))
}

export const removeFromLayer = (entity: Entity, layer: string): void => {
  const entities = layerEntities.get(layer)
  if (entities) {
    entities.delete(entity)
    entity.layers.delete(layer)
  }
}

export const removeFromAllLayers = (entity: Entity): void => {
  layerEntities.forEach((entities, layer) => {
    if (entities.has(entity)) {
      removeFromLayer(entity, layer)
    }
  })
}

export const getLayerEntities = (layer: string): Set<Entity> => {
  return layerEntities.get(layer) ?? new Set()
}

// Layer collision listener management
export const registerLayerListener = (entity: Entity, layer: string): () => void => {
  if (!layerListeners.has(layer)) {
    layerListeners.set(layer, new Set())
  }
  layerListeners.get(layer)!.add(entity)
  return () => layerListeners.get(layer)?.delete(entity)
}

export const getLayerListeners = (layer?: string): Map<string, Set<Entity>> | Set<Entity> => {
  if (layer === undefined) {
    return layerListeners
  }
  return layerListeners.get(layer) ?? new Set()
}