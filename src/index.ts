import { addEntity, Game } from '../lib/Game'
import Scene from '../lib/Scene'
import createPlayer from './player'
import { createRupert } from './rupert'

// register global enums
import 'lib/global'
import './global'

enum Scenes {
  main = 'main',
  menu = 'menu'
}

const mainScene = new Scene(Scenes.main, async (container) => {
  console.log('Events', Events, 'Layers', Layers, 'Animations', Animations)
  const player = createPlayer()
  // Setup player
  player.set({ position: { x: 100, y: 100 } })
  addEntity(player)

  const rupert = createRupert()
  // Setup Rupert
  rupert.set({ position: { x: 300, y: 300 } })
  console.log('Rupert', rupert)
  addEntity(rupert)
})

export const startGame = async () => {
  // Initialize game
  const game = new Game({
    backgroundColor: "#a0a0a0",
    antialias: true
  })

  // Load assets
  await game.load({
    spritesheets: ['/spritesheets/c01.json']
  })

  // Start game loop
  game.start()

  // Initialize scene
  await mainScene.init()
}

startGame()
