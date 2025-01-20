import { Actor } from 'lib/Actor'
import Layer from 'lib/layer'

export default function createPlayer() {
  const player = new Actor('idleRight/c01')
  player.animate({
    [Animations.acceleratingRight]: 'acceleratingRight/c01',
    [Animations.acceleratingUp]: 'acceleratingUp/c01',
    [Animations.acceleratingLeft]: 'acceleratingLeft/c01',
    [Animations.acceleratingDown]: 'acceleratingDown/c01',
    [Animations.stoppingRight]: 'acceleratingRight/c01',
    [Animations.stoppingUp]: 'acceleratingUp/c01',
    [Animations.stoppingLeft]: 'acceleratingLeft/c01',
    [Animations.stoppingDown]: 'acceleratingDown/c01',
    [Animations.stoppedRight]: 'stoppedRight/c01-0',
    [Animations.stoppedUp]: 'stoppedUp/c01-1',
    [Animations.stoppedLeft]: 'stoppedLeft/c01-2',
    [Animations.stoppedDown]: 'stoppedDown/c01-3',
    [Animations.idleRight]: 'idleRight/c01',
    [Animations.idleUp]: 'idleUp/c01',
    [Animations.idleLeft]: 'idleLeft/c01',
    [Animations.idleDown]: 'idleDown/c01',
    [Animations.movingRight]: 'movingRight/c01',
    [Animations.movingUp]: 'movingUp/c01',
    [Animations.movingLeft]: 'movingLeft/c01',
    [Animations.movingDown]: 'movingDown/c01'
  })
  Layer.add(Layers.player, player)
  return player
}