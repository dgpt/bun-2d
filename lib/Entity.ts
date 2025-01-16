import { Sprite, AnimatedSprite, type IPointData, type DisplayObjectEvents, Container, Texture, ObservablePoint } from 'pixi.js'
import { Bodies, Body, World, type IBodyDefinition } from 'matter-js'
import { Layers, addToLayer, removeFromAllLayers, registerLayerListener } from './layers'
import { getState } from './game'
import { Events, on, emit, isPixiEvent, type EventData } from './events'
import { Animations } from './animations'
import { Plugin } from './Plugin'
import type { MovementSettings } from './plugs/movement'

// Default physics values optimized for top-down 2D game
const DEFAULT_PHYSICS: IBodyDefinition = {
  isStatic: false,
  restitution: 0.2,    // Slight bounce for object interactions
  friction: 0.8,       // High friction for heavier objects
  frictionAir: 0.3,    // Moderate air resistance for weight
  frictionStatic: 0.7, // High static friction for heavy objects
  density: 0.01,       // Higher density for weight
  inertia: Infinity,   // Prevent rotation
  isSensor: false      // Solid by default
}

// Plugin settings type federation
export interface EntityPluginSettings {}

export type EntityOptions = {
  physics?: Partial<IBodyDefinition>
  static?: boolean
  velocity?: IPointData
  position?: IPointData
  plugins?: Partial<EntityPluginSettings>
}

export class Entity extends Container {
  public body: Matter.Body
  public layers = new Set<string>([Layers.entities])
  public animationSpeed = 0.1
  public staticAnimationDelay = 800
  public readonly plugins = new Set<string>()
  private pluginSettings = new Map<string, unknown>()

  private garbage: Array<() => void> = []
  private animations: Record<string, string | string[]> = {}
  private currentSprite?: Sprite | AnimatedSprite
  private updaters = new Set<() => void>()

  constructor(textureNameOrNames: string | string[], options: EntityOptions = {}) {
    super()

    // Create sprite first to get dimensions
    this.setSprite(textureNameOrNames)

    // Set initial texture as idle animation
    this.animate({
      [Animations.idle]: textureNameOrNames
    })

    // Initialize plugin settings from options
    if (options.plugins) {
      for (const [key, value] of Object.entries(options.plugins)) {
        this.setPluginSettings(key, value)
      }
    }

    // Listen for basic animation events
    this.on(Events.animation, (event: Event, data: EventData[Events.animation]) => {
      this.playAnimation(data.type)
    })

    // Create physics body with sprite dimensions
    this.body = Bodies.rectangle(
      options.position?.x ?? 0,
      options.position?.y ?? 0,
      this.width,
      this.height,
      {
        ...DEFAULT_PHYSICS,
        ...options.physics
      }
    )
    this.body.plugin = { entity: this }

    // Add to physics world
    const { engine } = getState()
    World.add(engine.world, this.body)

    // Apply any additional options
    if (options.position) {
      this.setPosition(options.position)
    }
    if (options.velocity) {
      this.velocity = options.velocity
    }
    if (options.static !== undefined) {
      this.static = options.static
    }

    // Setup cleanup
    this.on(Events.cleanup, () => {
      this.destroy()
    })

    // Setup collision animation handling
    this.on(Events.collision, () => {
      // Emit collision animation event
      emit(Events.animation, { type: Animations.collision })
    })

    // Start with idle animation
    emit(Events.animation, { type: Animations.idle })
  }

  get sprite(): Sprite | AnimatedSprite {
    return this.currentSprite!
  }

  set sprite(value: string | string[]) {
    this.setSprite(value)
  }

  set animation(value: string[]) {
    this.setSprite(value)
  }

  set velocity(value: IPointData) {
    Body.setVelocity(this.body, value)
  }

  get velocity(): IPointData {
    return this.body.velocity
  }

  set static(value: boolean) {
    Body.setStatic(this.body, value)
  }

  setPosition(value: IPointData): void {
    super.position.set(value.x, value.y)
    Body.setPosition(this.body, value)
  }

  private setSprite(textureNameOrNames: string | string[]): Sprite | AnimatedSprite {
    // Remove current sprite if it exists
    if (this.currentSprite) {
      this.removeChild(this.currentSprite)
    }

    // Create appropriate sprite type based on input
    if (Array.isArray(textureNameOrNames)) {
      const sprite = new AnimatedSprite(
        textureNameOrNames.map(name => Texture.from(name))
      )
      sprite.animationSpeed = this.animationSpeed
      sprite.play()
      this.currentSprite = sprite
    } else {
      this.currentSprite = new Sprite(Texture.from(textureNameOrNames))
    }

    // Set common properties
    this.currentSprite.anchor.set(0.5)
    this.addChild(this.currentSprite)
    return this.currentSprite
  }

  animate(animation: Animations, ...textureNames: string[]): void;
  animate(map: Record<string, string | string[]>): void;
  animate(animationOrMap: Animations | Record<string, string | string[]>, ...textureNames: string[]): void {
    if (typeof animationOrMap === 'object') {
      // Merge animation map directly
      this.animations = { ...this.animations, ...animationOrMap }
    } else {
      // Add single animation with rest parameters as texture names
      this.animations[animationOrMap] = textureNames
    }
  }

  playAnimation(name: string | string[]): Sprite | AnimatedSprite | undefined {
    // Check if it's a registered animation
    if (typeof name === 'string' && name in this.animations) {
      return this.setSprite(this.animations[name])
    }

    // Check if it's a valid texture or array of textures
    const { textures } = getState()
    const isValidTexture = (n: string) => n in textures
    if (
      (typeof name === 'string' && isValidTexture(name)) ||
      (Array.isArray(name) && name.every(isValidTexture))
    ) {
      return this.setSprite(name)
    }
  }

  set(options: EntityOptions): void {
    if (options.position) {
      this.setPosition(options.position)
    }

    if (options.velocity) {
      this.velocity = options.velocity
    }

    if (options.physics) {
      Body.set(this.body, options.physics)
    }

    if (options.static !== undefined) {
      this.static = options.static
    }
  }

  applyForce({ x, y }: IPointData): void {
    Body.applyForce(this.body, this.body.position, { x, y })
  }

  update(): void {
    const { x, y } = this.body.position
    super.position.set(x, y)
    this.rotation = this.body.angle

    // Run all plugin updaters
    for (const update of this.updaters) {
      update()
    }
  }

  on<T extends keyof DisplayObjectEvents>(event: T, fn: (...args: [Extract<T, keyof DisplayObjectEvents>]) => void, context?: any): this;
  on<E extends Events>(event: E, fn: (event: Event, data: EventData[E]) => void): this;
  on(event: string, fn: (event: Event, data: { a: Entity, b: Entity }) => void): this;
  on(event: any, fn: (...args: any[]) => void, context?: any): this {
    if (isPixiEvent(event)) {
      // Handle PIXI events
      super.on(event, fn, context)
    } else if (event in Events) {
      // Handle system events
      const typedEvent = event as Events
      const typedFn = fn as (event: Event, data: EventData[typeof typedEvent]) => void
      this.gc(on(typedEvent, typedFn))
    } else if (typeof event === 'string') {
      // Handle layer collision listening
      this.gc(registerLayerListener(this, event))
      // Layer events are collision events with the same shape as CollisionEvent
      const collisionFn = (e: Event, data: { a: Entity, b: Entity }) => fn(e, data)
      this.gc(on(Events.collision, collisionFn))
    }
    return this
  }

  gc(...fns: Array<() => void>): void {
    if (fns.length === 1 && Array.isArray(fns[0])) {
      this.garbage.push(...fns[0])
    } else {
      this.garbage.push(...fns)
    }
  }

  destroy(): void {
    const { engine } = getState()
    World.remove(engine.world, this.body)
    removeFromAllLayers(this)
    this.garbage.forEach(fn => fn())
    super.destroy()
  }

  use<T>(plugin: Plugin<T>, settings?: T): this {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin ${plugin.name} is already initialized on this entity`)
      return this
    }

    // Store plugin settings
    if (settings) {
      this.pluginSettings.set(plugin.name, settings)
    }

    // Initialize plugin with settings
    if (plugin.init) {
      plugin.init(this, settings ?? this.pluginSettings.get(plugin.name) as T)
    }

    if (plugin.update) {
      this.updaters.add(() => plugin.update?.(this))
    }

    if (plugin.events) {
      // Register all plugin events
      for (const [event, handler] of Object.entries(plugin.events)) {
        if (!handler) continue
        this.on(event, handler.bind(this, this))
      }
    }

    this.plugins.add(plugin.name)
    return this
  }

  getPluginSettings<T>(pluginName: string): T | undefined {
    return this.pluginSettings.get(pluginName) as T | undefined
  }

  setPluginSettings<T>(pluginName: string, settings: T): void {
    this.pluginSettings.set(pluginName, settings)
  }
}