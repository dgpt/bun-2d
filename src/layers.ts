import Layers, { type LayerTypes } from 'lib/Layers'

// Define game-specific layers
export enum GameLayers {
  player = 'player',
  npc = 'npc'
}

// Extend the base LayerTypes with game-specific layers
declare module 'lib/Layers' {
  interface LayerTypes {
    player: GameLayers.player,
    npc: GameLayers.npc
  }
}

// Register game layers
new Layers(GameLayers)

// Re-export Layer type for convenience
export { type Layer } from 'lib/Layers'
export default GameLayers