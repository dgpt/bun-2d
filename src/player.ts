import { Actor } from '../lib/Actor'
import Layers from './layers'
import { addToLayer } from '../lib/layers'

export default function createPlayer() {
  const player = new Actor('c01-0', { useKeyboard: true })
  addToLayer(player, Layers.player)
  return player
}