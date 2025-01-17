import Animations, { type IAnimations } from 'lib/animations'

// Extend the base IAnimations with game-specific animations
declare module 'lib/animations' {
  interface IAnimations {
    attack: 'attack'
    defend: 'defend'
    jump: 'jump'
  }
}

// Register game animations
new Animations('attack', 'defend', 'jump')