import { Sprite, AnimatedSprite, type IPointData, type DisplayObjectEvents, Container, Texture, ObservablePoint } from 'pixi.js'
import { Bodies, Body, World, type IBodyDefinition } from 'matter-js'
import Layers, { type Layer } from './Layers'
import { getState } from './Game'
import { Events, on, emit, isPixiEvent, type EventData } from './events'
import { Animations } from './animations'
import { Plugin, PluginSettings } from './Plugin'

// Default physics values optimized for top-down 2D game
const DEFAULT_PHYSICS: IBodyDefinition = {
  isStatic: false,
  restitution: 0.2,    // Slight bounce for object interactions
  friction: 0.1,       // Lower friction for smoother movement
  frictionAir: 0.1,    // Lower air resistance for smoother movement
  frictionStatic: 0.2, // Lower static friction for smoother movement
  density: 0.01,       // Higher density for weight
  inertia: Infinity,   // Prevent rotation
  isSensor: false      // Solid by default
}

export type EntityOptions = {
  physics?: Partial<IBodyDefinition>
  static?: boolean
  velocity?: IPointData
  position?: IPointData
  plugins?: Partial<PluginSettings>
}

export class Entity extends Container {
  public body: Matter.Body
  public layers = new Set<Layer>()
  public animationSpeed = 0.1
  public staticAnimationDelay = 800
  public readonly plugins = new Map<string, unknown>()
  public readonly id = crypto.randomUUID()

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

    this.set(options)

    // Setup cleanup
    this.on(Events.cleanup, () => {
      this.destroy()
    })

    // Setup collision animation handling
    this.on(Events.collision, () => {
      // Emit collision animation event
      emit(Events.animation, { type: Animations.collision })
    })
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
    // Only update if the value is actually changing
    if (this.body.isStatic !== value) {
      Body.setStatic(this.body, value)
    }
  }

  get static(): boolean {
    return this.body.isStatic
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

    // Store plugin settings if provided
    if (options.plugins) {
      for (const [key, value] of Object.entries(options.plugins)) {
        this.plugins.set(key, value as Plugin<PluginSettings>)
      }
    }
  }

  applyForce({ x, y }: IPointData): void {
    Body.applyForce(this.body, this.body.position, { x, y })
  }

  update(): void {
    const { x, y } = this.body.position
    super.position.set(x, y)
    this.rotation = this.body.angle

    // Run all plugin updaters regardless of static state
    for (const update of this.updaters) {
      update()
    }
  }

  on<T extends keyof DisplayObjectEvents>(event: T, fn: (...args: [Extract<T, keyof DisplayObjectEvents>]) => void, context?: any): this;
  on<E extends Events>(event: E, fn: (event: Event, data: EventData[E]) => void): this;
  on(event: Layer, fn: (event: Event, data: Entity) => void): this;
  on(event: any, fn: (...args: any[]) => void, context?: any): this {
    if (isPixiEvent(event)) {
      // For PIXI events, register with PIXI and track for cleanup
      super.on(event, fn, context)
      this.gc(() => super.off(event, fn, context))
    } else if (event in Object.values(Events)) {
      this.gc(on(event, fn))
    } else if (event in Layers) {
      // Handle layer collision listening
      this.gc(
        Layers[event as Layer].listen(this)
      )

      // Layer events are collision events with the same shape as CollisionEvent
      const collisionFn = (e: Event, data: { a: Entity, b: Entity }) => {
        // Only call handler if this entity is involved in the collision
        const isA = data?.a === this
        const isB = data?.b === this
        if (isA || isB) {
          // Pass the other entity as data
          fn(e, isA ? data.b : data.a)
        }
      }
      this.gc(on(event, collisionFn))
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

    // Remove from all layers
    this.layers.forEach(layer => {
      Layers[layer].entities.remove(this)
      Layers[layer].listeners.remove(this)
    })

    this.garbage.forEach(fn => fn())
    super.destroy()
  }

  use(plugin: Plugin, settings?: unknown): this {
    if (this.plugins.has(plugin.name)) {
      return this
    }

    // Store settings under plugin name
    if (settings) {
      this.plugins.set(plugin.name, settings)
    }

    // Initialize plugin with settings
    if (plugin.init) {
      plugin.init(this, settings)
    }

    if (plugin.update) {
      this.updaters.add(() => plugin.update?.(this))
    }

    if (plugin.events) {
      // Register all plugin events
      for (const [event, handler] of Object.entries(plugin.events)) {
        if (!handler) continue
        this.on(event, handler.bind(plugin, this))
      }
    }

    return this
  }
}