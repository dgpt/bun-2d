declare module 'pathfinding' {
  export class Grid {
    constructor(width: number, height: number)
    width: number
    height: number
    setWalkableAt(x: number, y: number, walkable: boolean): void
    clone(): Grid
  }

  export class BiBreadthFirstFinder {
    constructor(options?: { diagonalMovement?: DiagonalMovement })
    findPath(startX: number, startY: number, endX: number, endY: number, grid: Grid): [number, number][]
  }

  export enum DiagonalMovement {
    Always = 1,
    Never = 2,
    IfAtMostOneObstacle = 3,
    OnlyWhenNoObstacles = 4
  }
}