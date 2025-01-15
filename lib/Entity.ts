import { Sprite, AnimatedSprite, type IPointData, type DisplayObjectEvents, Container, Texture, ObservablePoint } from 'pixi.js'
import { Bodies, Body, World, type IBodyDefinition } from 'matter-js'
import { Layers, addToLayer, removeFromAllLayers, registerLayerListener } from './layers'
import { getState } from './game'
import { Events, on } from './events'
import { Animations } from './animations'

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

type SetOptions = {
  physics?: Partial<IBodyDefinition>
  static?: boolean
  velocity?: IPointData
  position?: IPointData
}

export class Entity extends Container {
  public body: Matter.Body
  public layers = new Set<string>([Layers.entities])
  public animationSpeed = 0.1
  public staticAnimationDelay = 800

  private garbage: Array<() => void> = []
  private animations: Record<string, string | string[]> = {}
  private currentSprite?: Sprite | AnimatedSprite
  private currentAnimation?: string

  constructor(textureNameOrNames: string | string[], options: SetOptions = {}) {
    super()

    // Create sprite first to get dimensions
    this.setSprite(textureNameOrNames)

    // Set initial texture as idle animation
    this.animate({
      [Animations.idle]: textureNameOrNames
    })
    this.playAnimation(Animations.idle)

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
  }

  set sprite(value: string) {
    this.setSprite(value)
  }

  set animation(value: string[]) {
    this.setSprite(value)
  }

  set velocity(value: IPointData) {
    Body.setVelocity(this.body, value)
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

  playAnimation(name: string): Sprite | AnimatedSprite | undefined {
    if (this.currentAnimation === name) return this.currentSprite

    const animation = this.animations[name] || name

    this.currentAnimation = name
    return this.setSprite(animation)
  }

  set(options: SetOptions): void {
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
  }

  on<T extends keyof DisplayObjectEvents>(event: T, fn: (...args: [Extract<T, keyof DisplayObjectEvents>]) => void, context?: any): this;
  on(event: Events | string, fn: (data?: any) => void): this;
  on(event: any, fn: (...args: any[]) => void, context?: any): this {
    if (typeof event === 'string' && event in Events) {
      this.gc(on(event, fn))
    } else if (typeof event === 'string' && event in Layers) {
      // Handle layer collision listening
      this.gc(
        registerLayerListener(this, event),
        on<{ a: Entity, b: Entity }>(event, (data) => {
          if (!data) return
          // Pass the other entity to the callback
          const other = data.a === this ? data.b : data.a
          // Play collision animation if defined
          if (this.animations[Animations.collision]) {
            const animation = this.playAnimation(Animations.collision)
            if (animation instanceof AnimatedSprite) {
              animation.onComplete = () => {
                this.playAnimation(Animations.idle)
              }
            } else {
              setTimeout(() => {
                this.playAnimation(Animations.idle)
              }, this.staticAnimationDelay)
            }
          }
          fn(other)
        })
      )
    } else {
      super.on(event, fn, context)
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
}