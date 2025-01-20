import { Sprite, AnimatedSprite, type IPointData, type DisplayObjectEvents, Container, Texture } from 'pixi.js'
import { Bodies, Body, World, type IBodyDefinition } from 'matter-js'
import { getState } from './Game'
import { isPixiEvent, on, emit, type EventHandler } from './events'
import { Plugin, type PluginSettings } from './Plugin'
import Layer from './layer'

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
  public layers: Layers[] = []
  public animationSpeed = 0.1
  public staticAnimationDelay = 800
  public name = 'Entity'
  public readonly plugins = new Map<string, unknown>()
  public readonly id = crypto.randomUUID()

  private garbage: Array<() => void> = []
  private animations: Partial<Record<Animations, string | string[]>> = {}
  private currentSprite?: Sprite | AnimatedSprite
  private updaters = new Set<() => void>()
  private lastDirection: IPointData = { x: 1, y: 0 }
  private baseScale = { x: 1, y: 1 }
  private initialTexture: string | string[]

  constructor(textureNameOrNames: string | string[], options: EntityOptions = {}) {
    super()

    // Store initial texture for resetting
    this.initialTexture = textureNameOrNames

    // Create sprite first to get dimensions
    this.setSprite(textureNameOrNames)

    // Set initial texture as idle animation
    this.animate({
      idle: textureNameOrNames
    })

    // Listen for basic animation events
    this.on(Events.animation, (data) => {
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
    this.on(Layers.entities, (other) => {
      console.log('collision')
      // Emit collision animation event
      other.emit(Events.animation, { type: 'collision' })
    })
  }

  get sprite(): Sprite | AnimatedSprite | undefined {
    return this.currentSprite
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

    const { animations, textures } = getState()
    console.log('Setting sprite for:', textureNameOrNames)

    // First check if it's an animation name
    if (typeof textureNameOrNames === 'string' && animations[textureNameOrNames]) {
      // Get the textures for this animation
      const frames = animations[textureNameOrNames]
      console.log(`Found animation ${textureNameOrNames}, frame count:`, frames.length)

      const sprite = new AnimatedSprite(frames)
      sprite.animationSpeed = this.animationSpeed
      sprite.play()
      this.currentSprite = sprite
    } else if (Array.isArray(textureNameOrNames)) {
      // Array of texture names
      const frames = textureNameOrNames.map(name => {
        const texture = textures[name]
        if (!texture) {
          console.warn(`Texture not found for frame: ${name}`)
          return Texture.EMPTY
        }
        return texture
      })

      const sprite = new AnimatedSprite(frames)
      sprite.animationSpeed = this.animationSpeed
      sprite.play()
      this.currentSprite = sprite
    } else {
      // Single texture
      const texture = textures[textureNameOrNames]
      if (!texture) {
        console.warn(`Texture not found: ${textureNameOrNames}`)
        this.currentSprite = new Sprite(Texture.EMPTY)
      } else {
        this.currentSprite = new Sprite(texture)
      }
    }

    // Set common properties
    this.currentSprite.anchor.set(0.5)
    this.currentSprite.scale.copyFrom(this.baseScale)
    this.addChild(this.currentSprite)
    return this.currentSprite
  }

  animate(animation: Animations, ...textureNames: string[]): void;
  animate(map: Partial<Record<Animations, string | string[]>>): void;
  animate(animationOrMap: Animations | Partial<Record<Animations, string | string[]>>, ...textureNames: string[]): void {
    if (typeof animationOrMap === 'object') {
      // Merge animation map directly
      this.animations = { ...this.animations, ...animationOrMap }
    } else if (animationOrMap in Animations) {
      // Add single animation with rest parameters as texture names
      this.animations[animationOrMap] = textureNames.length === 1 ? textureNames[0] : textureNames
    }
  }

  playAnimation(name: Animations): Sprite | AnimatedSprite | undefined {
    console.log('playing animation', name, this.animations[name], this.animations)
    // Check if it's a registered animation
    const animation = this.animations[name]
    if (animation) {
      return this.setSprite(animation)
    }
    return undefined
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

  // Method overloads for different event types
  on<T extends keyof DisplayObjectEvents>(
    event: T,
    fn: (...args: any[]) => any,
    context?: any
  ): this;
  on<E extends Events | Layers>(
    event: E,
    fn: (data: EventDataForEvent<E>, event: CustomEvent<EventDataForEvent<E>>) => void
  ): this;
  on(
    event: keyof DisplayObjectEvents | Events | Layers,
    fn: ((...args: any[]) => any) | ((data: any, event: CustomEvent<any>) => void),
    context?: any
  ): this {
    if (typeof event === 'string' && event in Layers) {
      // Add this entity as a listener for the layer
      Layer.listen(event as Layers, this)
    } else if (isPixiEvent(event as Events)) {
      // For PIXI events, register with PIXI and track for cleanup
      const pixiHandler = ((...args: any[]) => {
        const customEvent = new CustomEvent(event as string, { detail: args[0] })
        fn(args[0], customEvent)
      }) as (...args: any[]) => void
      super.on(event as keyof DisplayObjectEvents, pixiHandler, context)
      this.gc(() => super.off(event as keyof DisplayObjectEvents, pixiHandler))
    } else {
      // For all other events, use our event system
      this.gc(on(event as Events, fn as EventHandler<Events>))
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

    // Add update function to updaters if it exists
    if (plugin.update) {
      const boundUpdate = plugin.update.bind(plugin)
      this.updaters.add(() => boundUpdate(this))
    }

    // Register all plugin events
    if (plugin.events) {
      for (const [eventName, handler] of Object.entries(plugin.events)) {
        if (!handler) continue
        this.on(eventName as Events, handler.bind(plugin, this) as EventHandler<Events>)
      }
    }

    return this
  }

  /**
   * Checks if an animation exists for the given name
   */
  hasAnimation(name: Animations): boolean {
    return name in this.animations
  }

  /**
   * Sets the scale of the sprite, preserving the base scale
   */
  setScale(scale: IPointData): void {
    if (this.currentSprite) {
      this.currentSprite.scale.set(
        this.baseScale.x * scale.x,
        this.baseScale.y * scale.y
      )
    }
  }

  /**
   * Sets the base scale for the sprite (before any mirroring)
   */
  setBaseScale(scale: IPointData): void {
    this.baseScale = { ...scale }
    if (this.currentSprite) {
      this.currentSprite.scale.copyFrom(this.baseScale)
    }
  }

  /**
   * Resets the sprite to its initial texture and scale
   */
  resetSprite(): void {
    this.setSprite(this.initialTexture)
    this.setScale({ x: 1, y: 1 })
  }
}