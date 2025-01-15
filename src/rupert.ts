import { Entity } from '../lib/Entity'
import { Events } from '../lib/events'
import { openDialog } from '../lib/Dialog'
import { Layers } from '../lib/layers'
import { Animations } from '../lib/animations'

const DIALOG_TEXT = "Hello! I'm Rupert. Press Space or Enter to continue."

export function createRupert(): Entity {
  const rupert = new Entity('c01-0', {
    physics: { isStatic: true }
  })

  // Add to NPC layer
  rupert.layers.add(Layers.npc)

  // Setup collision animation
  rupert.animate({
    [Animations.collision]: 'c01-1'
  })

  // Handle collisions with player
  rupert.on(Layers.player, () => {
    openDialog(DIALOG_TEXT)
  })

  // Handle dialog events
  rupert.on(Events.dialogOpen, () => {
    rupert.velocity = { x: 0, y: 0 }
  })
  .on(Events.dialogClose, () => {
    rupert.velocity = { x: 0, y: 0 }
  })

  return rupert
}