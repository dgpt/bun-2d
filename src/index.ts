import { Game, addEntity } from '../lib/Game'
import { createDialog } from '../lib/Dialog'
import Scene, { Scenes } from '../lib/Scene'
import createPlayer from './player'
import { createRupert } from './rupert'

const mainScene = new Scene(Scenes.main, async (container) => {
  const player = createPlayer()
  // Setup player
  player.set({ position: { x: 100, y: 100 } })
  addEntity(player)

  const rupert = createRupert()
  // Setup Rupert
  rupert.set({ position: { x: 300, y: 300 } })
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
