import { Container, Text } from 'pixi.js'
import { Events, type EventDataType } from './events'
import { emit, on } from './events'
import { getState } from './game'

export class Dialog {
  private container: Container
  private text: Text
  private cleanupFns: Array<() => void> = []
  private isOpen = false

  constructor(private parentContainer: Container) {
    this.container = new Container()
    this.text = new Text('', {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xffffff,
      wordWrap: true,
      wordWrapWidth: 400
    })

    this.container.addChild(this.text)

    // Handle window resizing
    this.cleanupFns.push(
      on(Events.resize, (event: Event, data: EventDataType<Events.resize>) => {
        this.updateLayout()
      })
    )

    // Handle keyboard input
    this.cleanupFns.push(
      on(Events.keyDown, (event: Event, data: EventDataType<Events.keyDown>) => {
        if (this.isOpen && (data.key === ' ' || data.key === 'Enter')) {
          this.close()
        }
      })
    )

    // Cleanup when dialog is closed
    this.cleanupFns.push(
      on(Events.cleanup, (event: Event, data: EventDataType<Events.cleanup>) => {
        this.destroy()
      })
    )

    this.updateLayout()
  }

  private updateLayout(): void {
    const { app } = getState()
    const { width, height } = app.screen
    this.text.x = (width - this.text.width) / 2
    this.text.y = height - this.text.height - 50
  }

  open(message: string): void {
    if (this.isOpen) return
    this.text.text = message
    this.isOpen = true
    this.parentContainer.addChild(this.container)
    emit(Events.dialogOpen, undefined)
  }

  close(): void {
    if (!this.isOpen) return
    this.isOpen = false
    this.parentContainer.removeChild(this.container)
    emit(Events.dialogClose, undefined)
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