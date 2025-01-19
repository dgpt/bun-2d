import { Actor } from 'lib/Actor'
import Layer from 'lib/layer'

export default function createPlayer() {
  const player = new Actor('c01-0', {
    plugins: {
      movement: {
        spriteDirection: { x: 1, y: 0 }
      }
    }
  })
  Layer.add(Layers.player, player)
  return player
}