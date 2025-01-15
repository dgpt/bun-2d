import { init, loadAssets, addChild } from '../lib/game'
import { createDialog } from '../lib/Dialog'
import Scene, { Scenes } from '../lib/Scene'
import createPlayer from './player'
import { createRupert } from './rupert'

const mainScene = new Scene(Scenes.main, async (container) => {
  const player = createPlayer()
  // Setup player
  player.set({ position: { x: 100, y: 100 } })
  addChild(player)

  const rupert = createRupert()
  // Setup Rupert
  rupert.set({ position: { x: 300, y: 300 } })
  addChild(rupert)
})

export const startGame = async () => {
  await init()
  await loadAssets({
    spritesheets: [
      '/spritesheets/c01.json'
    ]
  })
  await mainScene.init()
}

startGame()
