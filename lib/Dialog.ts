import { Container, Text, Graphics } from 'pixi.js'
import { Events, on, emit } from './events'
import { Keys } from './keys'
import { getState } from './game'

export class Dialog {
  private container: Container
  private text: Text
  private bg: Graphics
  private cleanupFns: Array<() => void> = []
  private isOpen = false

  constructor(private parentContainer: Container) {
    this.container = new Container()

    // Create semi-transparent background
    this.bg = new Graphics()
    this.container.addChild(this.bg)

    // Create text
    this.text = new Text('', {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xffffff,
      wordWrap: true,
      wordWrapWidth: window.innerWidth - 40
    })
    this.text.x = 20
    this.text.y = 20
    this.container.addChild(this.text)

    // Handle window resize
    this.cleanupFns.push(
      on(Events.resize, () => {
        this.updateLayout()
      })
    )

    // Handle dialog controls
    this.cleanupFns.push(
      on(Events.keyDown, (event?: KeyboardEvent) => {
        if (event && this.isOpen &&
          (event.key.toLowerCase() === Keys.Space ||
           event.key.toLowerCase() === Keys.Enter)) {
          this.close()
        }
      })
    )

    // Handle cleanup
    this.cleanupFns.push(
      on(Events.cleanup, () => {
        this.destroy()
      })
    )

    this.updateLayout()
  }

  private updateLayout(): void {
    this.bg.clear()
    this.bg.beginFill(0x000000, 0.7)
    this.bg.drawRect(0, 0, window.innerWidth, 100)
    this.bg.endFill()
    this.text.style.wordWrapWidth = window.innerWidth - 40
  }

  open(message: string): void {
    if (this.isOpen) return

    this.text.text = message
    this.parentContainer.addChild(this.container)
    this.isOpen = true
    emit(Events.dialogOpen)
  }

  close(): void {
    if (!this.isOpen) return

    this.parentContainer.removeChild(this.container)
    this.isOpen = false
    emit(Events.dialogClose)
  }

  destroy(): void {
    this.close()
    this.cleanupFns.forEach(fn => fn())
    this.container.destroy()
  }

  get isDialogOpen(): boolean {
    return this.isOpen
  }
}

// Singleton instance
let dialog: Dialog | null = null

export const openDialog = (message: string): void => {
  if (dialog?.isDialogOpen) return // Don't open if dialog already exists and is open

  if (!dialog) {
    const { container } = getState()
    dialog = new Dialog(container)
  }

  dialog.open(message)
}

export const closeDialog = (): void => {
  dialog?.close()
}

export const isDialogOpen = (): boolean => {
  return dialog?.isDialogOpen ?? false
}

export const createDialog = (parent: Container): void => {
  if (dialog) dialog.destroy()
  dialog = new Dialog(parent)
}