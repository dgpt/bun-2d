import { Entity } from 'lib/Entity'
import { emit, on } from 'lib/events'
import { openDialog } from 'lib/Dialog'
import Layer from 'lib/layer'

const DIALOG_TEXT = "Hello! I'm Rupert. Press Space or Enter to continue."

export function createRupert(): Entity {
  const rupert = new Entity('c01-0', {
  })

  // Add to NPC layer
  // Layer.add(Layers.npc, rupert)

  // // Setup collision animation
  // rupert.animate({
  //   collision: 'c01-1',
  // })

  // Handle collisions with player
  // rupert.on(Layers.player, () => {
  //   openDialog(DIALOG_TEXT)
  //   emit(Events.doAThing, { value: 1 })
  // })


  // rupert.on(Events.doAThing, (_, { value }) => {
  //   console.log('Rupert received event', value)
  // })

  return rupert
}