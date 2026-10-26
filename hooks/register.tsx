import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Scene, Stage } from '../types'
import { CAPTION, sceneSVG } from './scene'

const PANE = 'agent-theater'
// The live page (opened in its own window) reads this document and animates it.
const LIVE_URL = 'https://claude.ai/artifact/8BzHBRE6nCcDVA3EZmnZWN'
const TITLE = 'エージェント劇場'

const INITIAL: Stage = { scene: 'idle', from: 'idle', subs: 0, err: false, tool: '', seq: 0 }
// Change the tag when Stage's fields change: it declines what an earlier version stored.
const stage = atom({ plugin: 'agent-theater', key: 'stage' } as const, INITIAL, { shape: 'stage-1' })

const WEB = /^(WebSearch|WebFetch)$|claude-in-chrome|Claude_Browser|image_search|places_search|weather|sports/
const DOCS = /^(Read|Glob|Grep|Skill|ToolSearch|ListSkills|SearchSkills|ListMcpResourcesTool|ReadMcpResourceTool|ReadMcpResourceDirTool|ListConnectors|ListPlugins)$|memory_read|memory_list|Claude_Docs__(read|query|guide)/
const PLAN = /^(TaskCreate|TaskUpdate|TaskGet|TaskList|TodoWrite|EnterPlanMode|ExitPlanMode)$/
const DELIVER = /^(Artifact|SendUserFile|SendUserMessage|SendFile)$|Claude_Docs__|widgets__|visualize__show_widget/
const RUN = /^(Bash|Edit|Write|NotebookEdit|Monitor)$/

function classify(tool: string, input: Record<string, unknown>): Scene {
  if (tool === 'Agent' || tool === 'Task') return 'spawn'
  if (tool === 'AskUserQuestion') return 'ask'
  if (tool === 'Artifact' && (input.action === 'list' || input.action === 'read')) return 'docs'
  if (PLAN.test(tool)) return 'plan'
  if (WEB.test(tool)) return 'web'
  if (DOCS.test(tool)) return 'docs'
  if (RUN.test(tool)) return 'run'
  if (DELIVER.test(tool)) return 'deliver'
  if (tool.startsWith('mcp__')) return 'app'
  return 'run'
}

type Entry = { scene: Scene; from: Scene; subs: number; err: boolean; tool: string; seq: number; at: number }
let liveVersion: number | undefined
let liveOff = false
let recent: Entry[] = []
let pending: Stage | undefined
let pushing = false

function versionIn(text: string): number | undefined {
  const all = text.match(/version (\d+)/g)
  const last = all?.[all.length - 1]
  return last ? Number(last.slice(8)) : undefined
}

async function pushLive($: EngineInterface, st: Stage) {
  if (liveOff) return
  pending = st
  if (pushing) return
  pushing = true
  try {
    while (pending) {
      const s = pending
      pending = undefined
      const entry: Entry = { scene: s.scene, from: s.from, subs: s.subs, err: s.err, tool: s.tool, seq: s.seq, at: Date.now() }
      recent = [entry, ...recent].slice(0, 6)
      for (let attempt = 0; attempt < 2; attempt++) {
        const ran = await $.tool.call({
          tool: 'ArtifactData',
          action: 'set',
          url: LIVE_URL,
          collection: 'live',
          doc_id: 'now',
          data: { ...entry, recent },
          ...(liveVersion ? { if_version: liveVersion } : {}),
        })
        const text = 'deny' in ran && ran.deny !== undefined ? ran.deny : String(ran.text ?? '')
        const done = text.match(/now at version (\d+)/)
        if (done) {
          liveVersion = Number(done[1])
          break
        }
        const seen = versionIn(text)
        if (seen === undefined) {
          liveOff = true
          return
        }
        liveVersion = seen
      }
    }
  } catch {
    liveOff = true
  } finally {
    pushing = false
  }
}

async function change($: EngineInterface, fn: (s: Stage) => Stage) {
  const st = await update($, stage, fn)
  void pushLive($, st)
  return st
}

function go($: EngineInterface, scene: Scene, tool = '') {
  return change($, s => ({ ...s, from: s.scene, scene, tool, err: false, seq: s.seq + 1 }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'agent-theater',
      description: 'Claudeの作業に合わせてキャラクターが動くパネルを開く',
    })
    void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('command.run', { command: 'agent-theater' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: TITLE })

    return {
      text: opened.isPlaced
        ? 'エージェント劇場を開きました。'
        : `この画面では横のパネルを出せないため、ここに表示します。（${opened.reason}）`,
    }
  })

  on('turn.start', async ($, e, next) => {
    if (!e.agentId) await go($, 'recv')

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    // A subagent's own calls leave the main character where it is.
    if (e.agentId) return next(e)
    const tool = String(e.tool)
    if (tool === 'ArtifactData' && (e as unknown as { url?: string }).url === LIVE_URL) return next(e)
    const scene = classify(tool, e as unknown as Record<string, unknown>)
    if (scene === 'spawn') {
      await change($, s => ({ ...s, from: s.scene, scene, tool, err: false, subs: s.subs + 1, seq: s.seq + 1 }))
      try {
        return await next(e)
      } finally {
        await change($, s => ({ ...s, subs: Math.max(0, s.subs - 1), seq: s.seq + 1 }))
      }
    }
    await go($, scene, tool)
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError === true) {
      await change($, s => ({ ...s, from: s.scene, err: true, seq: s.seq + 1 }))
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const ended = await next(e)
    if (!(e as { agentId?: string }).agentId) {
      const answered = e.reason === 'answer'
      const end: Scene = answered ? 'done' : 'idle'
      await change($, s => ({ ...s, from: s.scene, scene: end, tool: '', err: false, subs: 0, seq: s.seq + 1 }))
      if (answered) {
        $.clock.after(4500, () => {
          void change($, (s): Stage => (s.scene === 'done' ? { ...s, from: 'done', scene: 'idle', seq: s.seq + 1 } : s))
        })
      }
    }

    return ended
  })

  // Where no pane is placed, the /agent-theater output row becomes a live stage.
  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    if (e.props.command !== 'agent-theater' || e.props.isErrored) return next(e)
    if (e.props.text.startsWith('エージェント劇場を開きました')) return next(e)
    const st = await read($, stage)
    if (e.surface === 'terminal') return next(e)
    const { Box, Svg, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Svg source={sceneSVG(st)} alt={CAPTION[st.scene]} isInteractive />
        <Text dimColor>この表示は作業に合わせて動きます。スクロールで見えなくなったら /agent-theater で出し直せます。</Text>
      </Box>
    )
  })

  // While a turn runs, the band above the prompt shows the stage too, where the surface draws one.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const st = await read($, stage)
    if (e.props.hasSurvey || (!e.props.isWorking && st.scene === 'idle')) return next(e)
    if (e.surface !== 'desktop') return next(e)
    const { Box, Svg } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Svg source={sceneSVG(st)} alt={CAPTION[st.scene]} width={300} height={250} isInteractive />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const st = await read($, stage)
    const caption = CAPTION[st.scene]
    if (e.surface === 'terminal') {
      const { Text } = $.ui.resolve(e)

      return <Text>{caption}</Text>
    }
    const { Box, Svg } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Svg source={sceneSVG(st)} alt={caption} isInteractive />
      </Box>
    )
  })
}
