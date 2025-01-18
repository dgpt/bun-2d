# pixi-matters
A lightweight, modular 2D game engine for PixiJS and Matter.js.

### WORK IN PROGRESS!
This is under active development and is not ready for use... yet

## Features

- Entity Component System (ECS) architecture
- Built-in physics using Matter.js
- Sprite and animation management
- Flexible plugin system
- Event-driven architecture
- Layer-based collision system
- Touch and keyboard input support
- Pathfinding capabilities
- Dialog system for in-game conversations
- Scene management
- Actor system for interactive entities

## Installation

```bash
bun add pixi-matters
```

## Quick Start

```typescript
import { Game, Entity } from 'pixi-matters'

// Initialize the game
const game = new Game({
  backgroundColor: "#a0a0a0",
  antialias: true
})

// Load assets
await game.load({
  spritesheets: ['path/to/spritesheet.json']
})

// Create a player entity
const player = new Entity('player-sprite', {
  position: { x: 100, y: 100 },
  plugins: {
    movement: {
      speed: 5,
      type: 'top-down'
    }
  }
})

// Start the game
game.start()
```

## Core Modules

### Game (`Game.ts`)
The central orchestrator that manages the game loop, physics, and resources.

```typescript
// Initialize with custom settings
const game = new Game({
  backgroundColor: "#a0a0a0",
  antialias: true
})

// Load game assets
await game.load({
  spritesheets: ['/spritesheets/characters.json']
})

// Game state management
game.pause()    // Pause game loop
game.resume()   // Resume game loop
game.isPaused() // Check pause state
game.togglePause() // Toggle pause state

// Entity management helpers
addEntity(player)    // Add entity to game
removeEntity(enemy)  // Remove entity from game
```

### Entity System

#### Entity (`Entity.ts`)
The foundational building block for game objects, with integrated physics and sprite management.

```typescript
import Layers from 'lib/Layers'
// Create a basic entity
const entity = new Entity('sprite-name', {
  position: { x: 0, y: 0 },
  physics: {
    isStatic: false,
    friction: 0.1,
    frictionAir: 0.1,
    density: 0.01,
    inertia: Infinity
  }
})

// Add to specific layer
entity.layers.add(Layers.player)

// Listen for collisions with specific layer
entity.on(Layers.npc, (npc) => {
  // Handle collision with NPC
})
```

### Layer System (`Layers.ts`)
Manages rendering and collision layers with type-safe layer definitions.

```typescript
// src/layers.ts
// Define game-specific layers
import Layers from 'lib/Layers'
// Register game layers
export default new Layers('player', 'npc', 'item')

// src/player.ts
// Use in entities
entity.layers.add(Layers.player)
entity.on(Layers.npc, (npc) => {
  // Handle NPC collision
})


// accessing entities from a layer
const entities = Layers.player.entities
// accessing all entities in game
const allEntities = Layers.entities.entities
// accessing entities listening to a layer
const listeners = Layers.player.listeners
```

### Animation System (`animations.ts`)
Handles sprite animations with type-safe animation definitions.

```typescript
// Register game animations
entity.animate({
  // system animations
  idle: ['idleFrame1', 'idleFrame2'],
  // custom animations
  run: ['runFrame1', 'runFrame2', 'runFrame3'],
  attack: ['attackFrame1', 'attackFrame2'],
  frameRate: 12
})

// Play animation
import Animations from 'lib/animations'
entity.playAnimation(Animations.idle)
entity.playAnimation(Animations.run)
```

### Plugin System (`Plugin.ts`)
Framework for creating custom entity behaviors with type-safe settings.

```typescript
// Define plugin settings
declare module 'lib/Plugin' {
  interface PluginSettings {
    movement: {
      speed: number
      type: 'top-down' | 'platformer'
    }
  }
}

// Create custom plugin
class CustomMovement extends Plugin<MovementSettings> {
  init(entity: Entity, settings?: MovementSettings) {
    entity.static = false
    entity.plugins.set(this.name, {
      speed: settings?.speed ?? 5,
      type: settings?.type ?? 'top-down'
    })
  }

  update(entity: Entity) {
    const settings = this.getSettings(entity)
    // Custom movement logic
  }
}

// Use plugin in entity
const player = new Entity('player', {
  plugins: {
    movement: {
      speed: 5,
      type: 'top-down'
    }
  }
})
```

### Event System (`events.ts`)
Robust event handling with type-safe event definitions.

```typescript
// src/events.ts
// Define custom events
declare module 'lib/events' {
  interface EventData {
    'player:levelup': { level: number }
    'item:pickup': { itemId: string }
  }
}
// register custom events
export default new Events('player:levelup', 'item:pickup')

// src/player.ts
import Events from 'lib/events'
// Listen for events
entity.on(Events.playerLevelup, (data) => {
  console.log(`Level up to ${data.level}!`)
})

// Emit events
emit(Events.itemPickup, { itemId: 'potion' })
```

### Dialog System (`Dialog.ts`)
Handles in-game conversations and interactive dialogs.

```typescript
// Create a simple dialog
const dialog = new Dialog({
  text: "Hello adventurer!",
  speed: 50,
  style: {
    fontSize: 16,
    fill: 0xffffff
  }
})

// Create interactive dialog
const dialog = createDialog({
  text: "Would you like to trade?",
  choices: [
    { text: "Yes", value: "trade" },
    { text: "No", value: "decline" }
  ],
  onChoice: (choice) => {
    if (choice.value === "trade") {
      openShop()
    }
  }
})

// Listen for dialog events
entity.on(Events.dialogOpen, () => {
  // Pause entity movement
  entity.velocity = { x: 0, y: 0 }
})
```

### Movement System (`plugs/movement/`)
Flexible movement system with multiple control schemes.

```typescript
// Top-down movement supporting keyboard, mouse, and touch controls
const player = new Entity('player', {
  plugins: {
    movement: {
      type: 'top-down',
      speed: 5,
      spriteDirection: { x: 1, y: 0 }
    }
  }
})
```

### Scene Management (`Scene.ts`)
Controls game scenes and transitions.

```typescript
// Define a scene
const mainScene = new Scene(Scenes.main, async (container) => {
  // Create and setup player
  const player = createPlayer()
  player.set({ position: { x: 100, y: 100 } })
  addEntity(player)

  // Create NPCs
  const npc = createNPC()
  npc.set({ position: { x: 300, y: 300 } })
  addEntity(npc)
})

// Initialize and switch scenes
await mainScene.init()
```

### Collision System (`collisions.ts`)
Layer-based collision detection and response.

```typescript
// Setup collision handlers
entity.on(Events.collision, ({ a, b }) => {
  // Handle general collision
})

// Layer-specific collisions
entity.on(GameLayers.player, (player) => {
  // Handle collision with player
})

// Trigger zone example
const triggerZone = new Entity('trigger', {
  physics: {
    isSensor: true,  // Non-solid collision
    isStatic: true
  }
})

triggerZone.on(GameLayers.player, (player) => {
  // Handle player entering zone
})
```

## Type Extension

The engine uses TypeScript's module augmentation to allow type-safe extension of core systems.
## Performance Tips

- Use static entities for immobile objects
- Implement proper cleanup with `entity.destroy()`
- Leverage the layer system for efficient collision detection
- Use sprite batching for large numbers of similar entities
- Minimize physics body count for better performance
- Use event pooling for frequent events
- Implement object pooling for frequently created/destroyed entities

### Physics Optimization
```typescript
// Optimize static objects
const wall = new Entity('wall', {
  physics: {
    isStatic: true,      // Immobile object
    isSensor: false,     // Solid collision
    friction: 0,         // No friction for walls
    restitution: 0       // No bounce
  }
})

// Optimize dynamic objects
const player = new Entity('player', {
  physics: {
    inertia: Infinity,   // Prevent rotation
    frictionAir: 0.1,    // Smooth movement
    density: 0.01        // Light weight for better control
  }
})
```

### Event Optimization
```typescript
// Use specific layers instead of general collision events
entity.on(GameLayers.player, (player) => {
  // More efficient than checking all collisions
})

// Clean up event listeners
const cleanup = entity.on(Events.collision, () => {
  // Handle collision
})
entity.gc(cleanup) // Auto-cleanup when entity is destroyed
```

### Memory Management
```typescript
// Proper entity cleanup
entity.destroy() // Removes from game, physics world, and cleans up events

// Object pooling for projectiles
const projectilePool = new Set<Entity>()

function getProjectile() {
  const projectile = projectilePool.values().next().value || createProjectile()
  projectilePool.delete(projectile)
  return projectile
}

function recycleProjectile(projectile: Entity) {
  projectile.set({ active: false })
  projectilePool.add(projectile)
}
```