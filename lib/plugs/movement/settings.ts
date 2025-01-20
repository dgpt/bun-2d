import type { IPointData } from 'pixi.js'
import type { IChamferableBodyDefinition } from 'matter-js'
import { DiagonalMovement } from 'pathfinding'

// Movement-specific settings
export type MovementSettings = Partial<{
  // Movement controls
  force: number
  maxSpeed: number
  acceleration: {
    enabled: boolean
    rate: number        // How quickly to accelerate (force multiplier per second)
    deceleration: number // How quickly to slow down (force multiplier per second)
    minForce: number    // Starting force when beginning movement
  }

  // Animation settings
  idleDelay: number

  // Pathfinding settings
  pathfinding: {
    diagonalMovement: DiagonalMovement
    gridCellSize: number
    recalculateDelay: number
    nodeProximity: number
    padding: number // Padding around obstacles in grid cells
  }

  // Input settings
  inputTimeout: number

  // Velocity thresholds
  velocityThreshold: number
  stoppingThreshold: number

  // Matter.js physics settings
  physics: Partial<IChamferableBodyDefinition>
}>

export const DEFAULT_MOVEMENT_SETTINGS: Required<MovementSettings> = {
  // Movement controls
  force: 0.002,
  maxSpeed: 3,
  acceleration: {
    enabled: true,
    rate: 0.004,        // Accelerate to max force in ~0.5 seconds
    deceleration: 0.006, // Decelerate at 1.5x acceleration rate
    minForce: 0.0002    // Start at 10% of max force
  },

  // Animation settings
  idleDelay: 500,

  // Pathfinding settings
  pathfinding: {
    diagonalMovement: DiagonalMovement.IfAtMostOneObstacle,
    gridCellSize: 32,
    recalculateDelay: 250,
    nodeProximity: 5,
    padding: 1
  },

  // Input settings
  inputTimeout: 100,

  // Velocity thresholds
  velocityThreshold: 0.05,
  stoppingThreshold: 0.5,

  // Matter.js physics settings
  physics: {
    friction: 0.0001,
    frictionStatic: 0.0,
    frictionAir: 0.01,    // Reduced from 0.2 to allow smoother deceleration
    restitution: 0.0,
    density: 0.001,
    inertia: Infinity,
    mass: 1,
    isSensor: false,
    isStatic: false,
    angle: 0,
    angularVelocity: 0,
    chamfer: undefined,
    collisionFilter: undefined,
    slop: 0.05,
    timeScale: 1
  }
}

// Helper type for movement states
export type MovementState = 'moving' | 'accelerating' | 'stopping' | 'stopped' | 'idle'
export type Direction = 'right' | 'left' | 'up' | 'down'