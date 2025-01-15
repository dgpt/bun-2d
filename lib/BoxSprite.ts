import { Sprite as PixiSprite, type IPointData } from 'pixi.js'
import { Bodies, Body } from 'matter-js'

export abstract class BoxSprite extends PixiSprite {
  readonly body!: Matter.Body // Using definite assignment assertion

  constructor() {
    super()
    // Set anchor to center to match physics body
    this.anchor.set(0.5)
  }

  protected initPhysics(width: number, height: number): void {
    // Create physics body based on sprite dimensions
    const body = Bodies.rectangle(
      0, 0,
      width,
      height,
      { 
        restitution: 0.8,
        friction: 0.1,
        frictionAir: 0.01
      }
    )
    Object.defineProperty(this, 'body', {
      value: body,
      writable: false,
      configurable: false
    })
  }

  setPosition({ x, y }: IPointData): void {
    Body.setPosition(this.body, { x, y })
    this.position.set(x, y)
  }

  setStatic(isStatic: boolean): void {
    Body.setStatic(this.body, isStatic)
  }

  setVelocity({ x, y }: IPointData): void {
    Body.setVelocity(this.body, { x, y })
  }

  applyForce({ x, y }: IPointData): void {
    Body.applyForce(this.body, this.body.position, { x, y })
  }
}
