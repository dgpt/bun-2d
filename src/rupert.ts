import { Entity } from 'lib/Entity'
import Events, { emit, on } from 'lib/events'
import { openDialog } from 'lib/Dialog'
import Layers from 'lib/Layers'
import Animations from 'lib/animations'

const DIALOG_TEXT = "Hello! I'm Rupert. Press Space or Enter to continue."
declare global {
  interface GameEvents {
    customEvent: void
    doAThing: { value: number }
  }
}

export function createRupert(): Entity {
  const rupert = new Entity('c01-0', {
    physics: { isStatic: true }
  })

  // Add to NPC layer
  rupert.layers.add(Layers.npc)
  rupert.layers.add(Layers.meow) // Claude: this should have a type error

  // Setup collision animation
  rupert.animate({
    collision: 'c01-1',
    jump: 'c01-2',
    poop: 'asdf' // Claude: this should cause a type error
  })

  // Setup collision animation
  rupert.animate({
    collision: 'c01-1',
    jump: 'c01-2',
  }) // Claude: this should NOT have a type error

  rupert.animate(Animations.kick, 'c01-3')

  rupert.playAnimation(Animations.collision)
  rupert.playAnimation(Animations.jump)
  rupert.playAnimation(Animations.poop) // Claude: this should have a type error

  // Handle collisions with player
  rupert.on(Layers.player, () => {
    openDialog(DIALOG_TEXT)
  })

  rupert.on(Events.dialogOpen, () => {
    openDialog(DIALOG_TEXT)
    emit(Events.customEvent)
  })

  rupert.on(Events.pointerTap, () => {
    console.log('pointertap')
  })

  // Handle dialog events
  rupert.on(Events.moomoomoo, () => { // Claude: this should have a type error
    rupert.velocity = { x: 0, y: 0 }
  })

  // global event listener
  on(Events.customEvent, () => {
    console.log('custom event')
    emit(Events.doAThing, { value: 42 })
  })

  rupert.on(Events.customEvent, () => {
    console.log('custom event')
    emit(Events.doAThing, { value: 42 })
  })

  rupert.on(Events.doAThing, (event, data) => {
    console.log('do a thing', data.value)
  })

  rupert.on(Events.notAThing, () => { // Claude: this should have a type error
    console.log('not a thing')
  })

  return rupert
}
