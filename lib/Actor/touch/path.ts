import { Events, emit } from '../../events'
import { Plugin } from '../../Plugin'
import type { Entity } from '../../Entity'
import type { IPointData } from 'pixi.js'
import { ARRIVAL_THRESHOLD, distance, normalize, applyMovementForce, handleMovementAnimation, type MovementSettings, DEFAULT_SPRITE_DIRECTION } from '../movement'
import { Body } from 'matter-js'
import { getState } from '../../game'

// Store target positions in a WeakMap to avoid polluting Entity
const targets = new WeakMap<Entity, IPointData>()
const settings = new WeakMap<Entity, MovementSettings>()

// Default settings for path movement
const DEFAULT_SETTINGS: MovementSettings = {
  spriteDirection: { x: 1, y: 0 } // Sprite faces right by default
}

export const path = new Plugin<MovementSettings>('touch-path', {
  init(entity: Entity, pluginSettings?: MovementSettings) {
    settings.set(entity, { ...DEFAULT_SETTINGS, ...pluginSettings })

    const { app, container } = getState()

    // Setup scene-wide click handling
    container.eventMode = 'static'
    container.hitArea = app.screen
    container.on('pointertap', (e) => {
      const pos = { x: e.global.x, y: e.global.y }
      emit<Events.touchMove>(Events.touchMove, pos)
    })
  },

  events: {
    [Events.touchMove]: (entity: Entity, event: CustomEvent<IPointData>) => {
      // Store target position and reset any existing velocity
      Body.setVelocity(entity.body, { x: 0, y: 0 })
      targets.set(entity, event.detail)
    },
  },

  update(entity: Entity) {
    const target = targets.get(entity)
    if (!target) return

    // Calculate distance to target using physics body position
    const pos = entity.body.position
    const dist = distance(pos, target)

    if (dist < ARRIVAL_THRESHOLD) {
      // Arrived at target - stop movement
      targets.delete(entity)
      Body.setVelocity(entity.body, { x: 0, y: 0 })
      return
    }

    // Calculate direction to target using physics body position
    const dx = target.x - pos.x
    const dy = target.y - pos.y
    const dir = normalize(dx, dy)
    applyMovementForce(entity, dir.x, dir.y)
    handleMovementAnimation(entity, dir, settings.get(entity)?.spriteDirection ?? DEFAULT_SPRITE_DIRECTION)
  }
})