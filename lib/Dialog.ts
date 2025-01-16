import { Container, Text, Graphics } from 'pixi.js'
import { Events } from './events'
import { emit } from './events'
import { getState } from './game'
import { Keys } from './keys'
import { Entity } from './Entity'

export class Dialog extends Entity {
  private text: Text
  private bg: Graphics
  private isOpen = false

  constructor() {
    super('', { static: true })

    // Create semi-transparent background
    this.bg = new Graphics()
    this.addChild(this.bg)

    // Create text with default style
    this.text = new Text('', {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xffffff,
      wordWrap: true,
      wordWrapWidth: 400
    })
    this.addChild(this.text)

    // Handle window resizing
    this.on(Events.resize, () => {
      this.updateLayout()
    })

    // Handle keyboard input for dialog control
    this.on(Events.keyDown, (event: Event, data: KeyboardEvent) => {
      if (!this.isOpen) return

      const key = data.key.toLowerCase()
      if (key === Keys.Space || key === Keys.Enter) {
        this.close()
      }
    })

    this.updateLayout()
  }

  private updateLayout(): void {
    const { app } = getState()

    // Update text wrapping based on screen size
    this.text.style.wordWrapWidth = app.screen.width - 40

    // Position text with padding
    this.text.x = 20
    this.text.y = 20

    // Update background to match text
    this.bg.clear()
    this.bg.beginFill(0x000000, 0.7)
    this.bg.drawRect(0, 0, app.screen.width, this.text.height + 40)
    this.bg.endFill()

    // Position dialog at bottom of screen
    this.y = app.screen.height - this.height - 20
  }

  open(message: string): void {
    if (this.isOpen) return

    this.text.text = message
    this.isOpen = true
    const { app } = getState()
    app.stage.addChild(this)
    this.updateLayout()
    emit(Events.dialogOpen)
  }

  close(): void {
    if (!this.isOpen) return

    this.isOpen = false
    const { app } = getState()
    app.stage.removeChild(this)
    emit(Events.dialogClose)
  }

  get isDialogOpen(): boolean {
    return this.isOpen
  }
}

// Singleton instance
let dialog: Dialog | null = null

export const openDialog = (message: string): void => {
  if (dialog?.isDialogOpen) return

  if (!dialog) {
    dialog = new Dialog()
  }

  dialog.open(message)
}

export const closeDialog = (): void => {
  dialog?.close()
}

export const isDialogOpen = (): boolean => {
  return dialog?.isDialogOpen ?? false
}

export const createDialog = (): void => {
  if (dialog) dialog.destroy()
  dialog = new Dialog()
}