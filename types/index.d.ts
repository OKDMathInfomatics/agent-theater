export type Scene =
  | 'idle' | 'recv' | 'plan' | 'web' | 'docs' | 'run'
  | 'app' | 'spawn' | 'ask' | 'deliver' | 'done'

export type Stage = {
  scene: Scene
  from: Scene
  subs: number
  err: boolean
  tool: string
  seq: number
}

declare module 'claude-code' {
  interface PluginState {
    'agent-theater': { stage: Shaped<Stage> }
  }
}
