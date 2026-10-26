import { expect, test } from 'claude-code/testing'

const ROW = {
  plugin: 'agent-theater',
  component: 'CommandOutput',
  requestId: 'm1',
  props: { command: 'agent-theater', args: '', text: 'この画面では横のパネルを出せないため、ここに表示します。（x）', isErrored: false },
} as const

test('the command row becomes a live stage where no pane is placed', async ($, on) => {
  on('command.register', () => ({ value: { command: 'agent-theater' } }))
  on('ui.open', () => ({ value: { isPlaced: false, reason: 'no pane here' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'WebSearch', query: 'x' })

  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...ROW, surface })
    const svg = await ui.find({ type: 'Svg' })
    expect(svg?.props.alt).toBe('Webで調べています')
    await ui.unmount()
  }
})

test('each step is sent to the live page, with the version it last saw', async ($, on) => {
  const writes: Array<Record<string, unknown>> = []
  on('command.register', () => ({ value: { command: 'agent-theater' } }))
  on('ui.open', () => ({ value: { isPlaced: false, reason: 'none' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', (_, e) => {
    if (e.tool === 'ArtifactData') {
      writes.push(e as unknown as Record<string, unknown>)
      return { result: {}, text: `Database set committed. The document is now at version ${writes.length + 1}.` }
    }
    return { result: {} }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/a' })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await new Promise(r => setTimeout(r, 50))

  const scenes = writes.map(w => (w.data as { scene: string }).scene)
  expect(scenes).toContain('docs')
  expect(scenes[scenes.length - 1]).toBe('run')
  expect(writes[writes.length - 1]?.if_version).toBeDefined()
})

test('a refused write is tried again on the next turn', async ($, on) => {
  let calls = 0
  let refuse = true
  on('command.register', () => ({ value: { command: 'agent-theater' } }))
  on('ui.open', () => ({ value: { isPlaced: false, reason: 'none' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', (_, e) => {
    if (e.tool === 'ArtifactData') {
      calls++
      if (refuse) return { deny: 'Claude wants to write to this artifact database' }
      return { result: {}, text: `The document is now at version ${calls + 1}.` }
    }
    return { result: {} }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  await new Promise(r => setTimeout(r, 30))
  const refused = calls
  await $.tool.call({ tool: 'Read', file_path: '/a' })
  await new Promise(r => setTimeout(r, 30))
  expect(calls).toBe(refused)

  refuse = false
  await $.turn.start({ text: 'next', turnId: 't2' })
  await new Promise(r => setTimeout(r, 30))
  expect(calls).toBeGreaterThan(refused)
})
