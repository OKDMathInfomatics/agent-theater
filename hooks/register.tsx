import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Scene, Stage } from '../types'
import { CAPTION, sceneSVG } from './scene'

const PANE = 'agent-theater'
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

function go($: EngineInterface, scene: Scene, tool = '') {
  return update($, stage, s => ({ ...s, from: s.scene, scene, tool, err: false, seq: s.seq + 1 }))
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

    return { text: opened.isPlaced ? 'エージェント劇場を開きました。' : 'この画面ではパネルを表示できません。' }
  })

  on('turn.start', async ($, e, next) => {
    if (!e.agentId) await go($, 'recv')

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    // A subagent's own calls leave the main character where it is.
    if (e.agentId) return next(e)
    const tool = String(e.tool)
    const scene = classify(tool, e as unknown as Record<string, unknown>)
    if (scene === 'spawn') {
      await update($, stage, s => ({ ...s, from: s.scene, scene, tool, err: false, subs: s.subs + 1, seq: s.seq + 1 }))
      try {
        return await next(e)
      } finally {
        await update($, stage, s => ({ ...s, subs: Math.max(0, s.subs - 1), seq: s.seq + 1 }))
      }
    }
    await go($, scene, tool)
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError === true) {
      await update($, stage, s => ({ ...s, from: s.scene, err: true, seq: s.seq + 1 }))
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const ended = await next(e)
    if (!(e as { agentId?: string }).agentId) {
      const answered = e.reason === 'answer'
      const end: Scene = answered ? 'done' : 'idle'
      await update($, stage, s => ({ ...s, from: s.scene, scene: end, tool: '', err: false, subs: 0, seq: s.seq + 1 }))
      if (answered) {
        $.clock.after(4500, () => {
          void update($, stage, (s): Stage => (s.scene === 'done' ? { ...s, from: 'done', scene: 'idle', seq: s.seq + 1 } : s))
        })
      }
    }

    return ended
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
