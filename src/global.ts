// Extend the base EventData type with game-specific events
interface EventData {
  [Events.customEvent]: void
  [Events.doAThing]: { value: number }
}

// Add event const values
enum Events {
  customEvent = 'customEvent',
  doAThing = 'doAThing'
}

enum Layers {
  npc = 'npc',
  player = 'player'
}

enum Animations {
  jump = 'jump',
  kick = 'kick'
}

window.Events = { ...window.Events, ...Events }
window.Layers = { ...window.Layers, ...Layers }
window.Animations = { ...window.Animations, ...Animations }