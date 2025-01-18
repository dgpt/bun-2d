import { Grid, BiBreadthFirstFinder, DiagonalMovement } from 'pathfinding'
import { Entity } from 'lib/Entity'
import type { IPointData } from 'pixi.js'
import { getState } from 'lib/Game'
import { Events, on } from 'lib/events'
import Layers from 'lib/Layers'
import { Body } from 'matter-js'
import type { Target, PathData } from './types'

// Grid size for pathfinding (smaller = more precise but slower)
const GRID_CELL_SIZE = 32

// Store active paths for entities
const activePaths = new WeakMap<Entity, PathData>()

// Track which entities have collision handlers
const collisionHandlers = new WeakSet<Entity>()

export const clearPath = (entity: Entity) => {
  activePaths.delete(entity)
}

export const hasActivePath = (entity: Entity) => {
  return activePaths.has(entity)
}

const setupCollisionHandler = (entity: Entity) => {
  if (collisionHandlers.has(entity)) return

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

        if (distSq > GRID_CELL_SIZE * GRID_CELL_SIZE) {
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
      }, 250) // Longer delay to ensure physics has settled
    })
  )

  collisionHandlers.add(entity)
}

export const getNextPathPoint = (entity: Entity): IPointData | null => {
  const pathData = activePaths.get(entity)
  if (!pathData || pathData.path.length === 0) {
    return null
  }

  // If we have a target entity, update the path end point
  if (pathData.target instanceof Entity) {
    const lastPoint = pathData.path[pathData.path.length - 1]
    if (
      Math.abs(pathData.target.x - lastPoint.x) > GRID_CELL_SIZE ||
      Math.abs(pathData.target.y - lastPoint.y) > GRID_CELL_SIZE
    ) {
      // Recalculate path if target has moved significantly
      findPath(entity, { x: pathData.target.x, y: pathData.target.y }, pathData.target)
      return getNextPathPoint(entity)
    }
  }

  // Get next point in path
  const nextPoint = pathData.path[0]
  const dx = nextPoint.x - entity.x
  const dy = nextPoint.y - entity.y

  // If we're close enough to the next point, remove it and get the next one
  if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
    pathData.path.shift()
    return getNextPathPoint(entity)
  }

  return nextPoint
}

const markEntityOnGrid = (grid: Grid, entity: Entity) => {
  const bounds = entity.getBounds()
  const startX = Math.max(0, Math.floor(bounds.left / GRID_CELL_SIZE))
  const startY = Math.max(0, Math.floor(bounds.top / GRID_CELL_SIZE))
  const endX = Math.min(grid.width - 1, Math.ceil(bounds.right / GRID_CELL_SIZE))
  const endY = Math.min(grid.height - 1, Math.ceil(bounds.bottom / GRID_CELL_SIZE))

  // Add some padding around entities to prevent getting too close
  const padding = 1
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

  // Clear any existing path before starting a new one
  clearPath(entity)

  // Skip pathfinding if target is at current position (used for stopping)
  if (Math.abs(destination.x - entity.x) < 5 && Math.abs(destination.y - entity.y) < 5) {
    return []
  }

  // Ensure collision handler is setup
  setupCollisionHandler(entity)

  // Create a grid based on the game dimensions
  const gridWidth = Math.ceil(app.screen.width / GRID_CELL_SIZE)
  const gridHeight = Math.ceil(app.screen.height / GRID_CELL_SIZE)
  const grid = new Grid(gridWidth, gridHeight)

  // Mark static entities and other obstacles
  for (const other of Layers.get(Layers.entities)) {
    if (other.id === entity.id) continue // Skip self
    if (target instanceof Entity && other.id === target.id) continue // Skip target entity
    markEntityOnGrid(grid, other)
  }

  // Create finder instance
  const finder = new BiBreadthFirstFinder({
    diagonalMovement: DiagonalMovement.Always
  })

  // Convert and clamp positions to grid coordinates
  const startX = clampToGrid(entity.x / GRID_CELL_SIZE, gridWidth)
  const startY = clampToGrid(entity.y / GRID_CELL_SIZE, gridHeight)
  const endX = clampToGrid(destination.x / GRID_CELL_SIZE, gridWidth)
  const endY = clampToGrid(destination.y / GRID_CELL_SIZE, gridHeight)

  // Clone grid before pathfinding to avoid modifying original
  const gridClone = grid.clone()

  // Find path
  const path = finder.findPath(startX, startY, endX, endY, gridClone)

  // If no path found, return empty array
  if (!path || path.length === 0) {
    return []
  }

  // Convert path back to world coordinates
  const worldPath = path.map(([x, y]) => ({
    x: x * GRID_CELL_SIZE + GRID_CELL_SIZE / 2,
    y: y * GRID_CELL_SIZE + GRID_CELL_SIZE / 2
  }))

  // Store path and destination
  activePaths.set(entity, {
    path: worldPath,
    target,
    destination,
    isRecalculating: false
  })

  return worldPath
}