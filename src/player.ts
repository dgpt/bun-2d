import { Actor } from '../lib/Actor'
import Layers from 'lib/Layers'

export default function createPlayer() {
  const player = new Actor('c01-0', {
    plugins: {
      movement: {
        spriteDirection: { x: 1, y: 0 }
      }
    }
  })
  Layers.add(Layers.player, player)
  return player
}