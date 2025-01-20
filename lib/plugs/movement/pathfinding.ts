import PF, { Grid, DiagonalMovement } from 'pathfinding'
import { Entity } from 'lib/Entity'
import type { IPointData } from 'pixi.js'
import { getState } from 'lib/Game'
import { on } from 'lib/events'
import { Body } from 'matter-js'
import type { Target, PathData } from './types'
import Layer from 'lib/layer'
import { DEFAULT_MOVEMENT_SETTINGS, type MovementSettings } from './settings'

// Remove the constant since we're using settings
// const GRID_CELL_SIZE = 32

// Store active paths for entities
const activePaths = new WeakMap<Entity, PathData>()

// Track which entities have collision handlers
const collisionHandlers = new WeakSet<Entity>()

const getSettings = (entity: Entity): Required<MovementSettings> => {
  // Check for settings from any top-down plugin
  const touchSettings = entity.plugins.get('topDown:touch') as MovementSettings
  const mouseSettings = entity.plugins.get('topDown:mouse') as MovementSettings

  return {
    ...DEFAULT_MOVEMENT_SETTINGS,
    ...mouseSettings,
    ...touchSettings // Touch settings take precedence if both are present
  }
}

export const clearPath = (entity: Entity) => {
  activePaths.delete(entity)
}

export const hasActivePath = (entity: Entity) => {
  return activePaths.has(entity)
}

const setupCollisionHandler = (entity: Entity) => {
  if (collisionHandlers.has(entity)) return

  const settings = getSettings(entity)

  entity.gc(
    on(Events.collision, () => {
      const pathData = activePaths.get(entity)
      if (!pathData || pathData.isRecalculating) return

      // Mark as recalculating to prevent multiple recalculations
      pathData.isRecalculating = true

      // Stop current movement
      Body.setVelocity(entity.body, { x: 0, y: 0 })

      // Add a small delay before recalculating to let physics settle
      setTimeout(() => {
        // Only recalculate if we're not too close to destination
        const dx = pathData.destination.x - entity.x
        const dy = pathData.destination.y - entity.y
        const distSq = dx * dx + dy * dy

        if (distSq > settings.pathfinding.gridCellSize * settings.pathfinding.gridCellSize) {
          // Try to find a path from our current position
          const newPath = findPath(entity, pathData.destination, pathData.target)

          // If no path found, clear the path
          if (!newPath || newPath.length === 0) {
            clearPath(entity)
          }
        } else {
          // We're close enough, just clear the path
          clearPath(entity)
        }

        pathData.isRecalculating = false
      }, settings.pathfinding.recalculateDelay)
    })
  )

  collisionHandlers.add(entity)
}

export const getNextPathPoint = (entity: Entity): IPointData | null => {
  const pathData = activePaths.get(entity)
  if (!pathData || pathData.path.length === 0) {
    return null
  }

  const settings = getSettings(entity)

  // If we have a target entity, update the path end point
  if (pathData.target instanceof Entity) {
    const lastPoint = pathData.path[pathData.path.length - 1]
    const { app } = getState()

    // Check if target is off screen or too far
    if (
      pathData.target.x < 0 ||
      pathData.target.x > app.screen.width ||
      pathData.target.y < 0 ||
      pathData.target.y > app.screen.height
    ) {
      clearPath(entity)
      return null
    }

    if (
      Math.abs(pathData.target.x - lastPoint.x) > settings.pathfinding.gridCellSize ||
      Math.abs(pathData.target.y - lastPoint.y) > settings.pathfinding.gridCellSize
    ) {
      // Recalculate path if target has moved significantly
      const newPath = findPath(entity, { x: pathData.target.x, y: pathData.target.y }, pathData.target)
      if (!newPath || newPath.length === 0) {
        clearPath(entity)
        return null
      }
      return pathData.path[0] // Return first point of new path directly instead of recursing
    }
  }

  // Get next point in path
  const nextPoint = pathData.path[0]
  const dx = nextPoint.x - entity.x
  const dy = nextPoint.y - entity.y

  // If we're close enough to the next point, remove it and get the next one
  if (Math.abs(dx) < settings.pathfinding.nodeProximity && Math.abs(dy) < settings.pathfinding.nodeProximity) {
    pathData.path.shift()
    // Return null if no more points, otherwise return next point directly
    return pathData.path.length === 0 ? null : pathData.path[0]
  }

  return nextPoint
}

const markEntityOnGrid = (grid: Grid, entity: Entity) => {
  const settings = getSettings(entity)
  const bounds = entity.getBounds()
  const startX = Math.max(0, Math.floor(bounds.left / settings.pathfinding.gridCellSize))
  const startY = Math.max(0, Math.floor(bounds.top / settings.pathfinding.gridCellSize))
  const endX = Math.min(grid.width - 1, Math.ceil(bounds.right / settings.pathfinding.gridCellSize))
  const endY = Math.min(grid.height - 1, Math.ceil(bounds.bottom / settings.pathfinding.gridCellSize))

  // Add padding around entities to prevent getting too close
  const padding = settings.pathfinding.padding
  for (let x = startX - padding; x <= endX + padding; x++) {
    for (let y = startY - padding; y <= endY + padding; y++) {
      if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
        grid.setWalkableAt(x, y, false)
      }
    }
  }
}

const clampToGrid = (value: number, max: number) => {
  return Math.max(0, Math.min(max - 1, Math.floor(value)))
}

export const findPath = (entity: Entity, destination: IPointData, target?: Target) => {
  const { app } = getState()
  const settings = getSettings(entity)

  // Clear any existing path before starting a new one
  clearPath(entity)

  // Validate destination is within screen bounds
  if (
    destination.x < 0 ||
    destination.x > app.screen.width ||
    destination.y < 0 ||
    destination.y > app.screen.height
  ) {
    return []
  }

  // Skip pathfinding if target is at current position (used for stopping)
  if (Math.abs(destination.x - entity.x) < settings.pathfinding.nodeProximity &&
    Math.abs(destination.y - entity.y) < settings.pathfinding.nodeProximity) {
    return []
  }

  // Ensure collision handler is setup
  setupCollisionHandler(entity)

  // Create a grid based on the game dimensions
  const gridWidth = Math.ceil(app.screen.width / settings.pathfinding.gridCellSize)
  const gridHeight = Math.ceil(app.screen.height / settings.pathfinding.gridCellSize)
  const grid = new Grid(gridWidth, gridHeight)

  // Mark static entities and other obstacles
  for (const other of Layer.get(Layers.entities)) {
    if (other.id === entity.id) continue // Skip self
    if (target instanceof Entity && other.id === target.id) continue // Skip target entity
    markEntityOnGrid(grid, other)
  }

  // Create A* finder instance with settings
  const finder = new PF.BiAStarFinder({
    diagonalMovement: settings.pathfinding.diagonalMovement
  })

  // Convert and clamp positions to grid coordinates
  const startX = clampToGrid(entity.x / settings.pathfinding.gridCellSize, gridWidth)
  const startY = clampToGrid(entity.y / settings.pathfinding.gridCellSize, gridHeight)
  const endX = clampToGrid(destination.x / settings.pathfinding.gridCellSize, gridWidth)
  const endY = clampToGrid(destination.y / settings.pathfinding.gridCellSize, gridHeight)

  // Clone grid before pathfinding to avoid modifying original
  const gridClone = grid.clone()

  // Find path
  const path = finder.findPath(startX, startY, endX, endY, gridClone)

  // If no path found, return empty array
  if (!path || path.length === 0) {
    return []
  }

  // Smooth the path while still in grid coordinates
  const smoothedGridPath = PF.Util.compressPath(path)

  // Convert smoothed path to world coordinates
  const smoothedPath = smoothedGridPath.map((point: number[]) => ({
    x: point[0] * settings.pathfinding.gridCellSize + settings.pathfinding.gridCellSize / 2,
    y: point[1] * settings.pathfinding.gridCellSize + settings.pathfinding.gridCellSize / 2
  }))

  // Store path and destination
  activePaths.set(entity, {
    path: smoothedPath,
    target,
    destination,
    isRecalculating: false
  })

  return smoothedPath
}