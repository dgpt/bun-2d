import Layers, { type LayerTypes } from 'lib/Layers'

// Extend the base LayerTypes with game-specific layers
declare module 'lib/Layers' {
  interface LayerTypes {
    player: 'player'
    npc: 'npc'
  }
}

// Define game-specific layers
export enum GameLayers {
  player = 'player',
  npc = 'npc'
}

// Register game layers
new Layers(GameLayers)

// Re-export Layer type for convenience
export { type Layer } from 'lib/Layers'
export default GameLayers