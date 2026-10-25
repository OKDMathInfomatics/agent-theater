import type { Scene, Stage } from '../types'

const FRONT = 232
const BACK = 118

type Spot = { x: number; y: number; f: 1 | -1 }

const SPOT: Record<Scene, Spot> = {
  idle: { x: 92, y: FRONT, f: -1 },
  recv: { x: 92, y: FRONT, f: -1 },
  ask: { x: 92, y: FRONT, f: 1 },
  plan: { x: 124, y: FRONT, f: 1 },
  spawn: { x: 124, y: FRONT, f: 1 },
  run: { x: 214, y: FRONT, f: 1 },
  deliver: { x: 286, y: FRONT, f: 1 },
  done: { x: 286, y: FRONT, f: 1 },
  web: { x: 58, y: BACK, f: 1 },
  docs: { x: 158, y: BACK, f: 1 },
  app: { x: 258, y: BACK, f: 1 },
}

export const CAPTION: Record<Scene, string> = {
  idle: '次の依頼を待っています',
  recv: '依頼を読んでいます',
  plan: '計画を立てています',
  web: 'Webで調べています',
  docs: '資料を読んでいます',
  run: 'ツールで作業しています',
  app: 'アプリと連携しています',
  spawn: '分身に手分けさせています',
  ask: 'あなたに質問しています',
  deliver: '成果物をお届け中',
  done: '完了しました！',
}

const scaleAt = (y: number) => (y === BACK ? 0.72 : 1) * 0.62

type Swing = { a: number; b: number; d: number; rev?: boolean }
type Act = { R?: Swing; L?: Swing; jump?: number; jd?: number; prop?: string }

const ACT: Record<Scene, Act> = {
  idle: {},
  recv: { R: { a: -56, b: -64, d: 0.8 }, prop: 'paper' },
  ask: { R: { a: -146, b: -156, d: 0.6 }, prop: 'sign' },
  plan: { R: { a: -84, b: -108, d: 0.22 }, prop: 'pen' },
  spawn: { R: { a: -150, b: -170, d: 0.4 }, L: { a: -150, b: -170, d: 0.4 }, jump: 8, jd: 0.4 },
  run: { R: { a: -50, b: -66, d: 0.13 }, L: { a: -48, b: -64, d: 0.13, rev: true } },
  deliver: { R: { a: -82, b: -88, d: 0.8 }, L: { a: -80, b: -86, d: 0.8 }, prop: 'box' },
  done: { R: { a: -158, b: -172, d: 0.25 }, L: { a: -158, b: -172, d: 0.25 }, jump: 14, jd: 0.25 },
  web: { R: { a: -60, b: -94, d: 0.7 }, prop: 'mag' },
  docs: { R: { a: -80, b: -135, d: 0.18 }, L: { a: -80, b: -135, d: 0.18, rev: true } },
  app: { R: { a: -50, b: -60, d: 0.15 }, L: { a: -45, b: -55, d: 0.15, rev: true }, prop: 'laptop' },
}

const OUT = 'var(--out)'

function prop(kind: string | undefined, pose: number): string {
  const at = `translate(29,-26) rotate(${-pose})`
  switch (kind) {
    case 'paper':
      return `<g transform="${at}"><rect x="-3" y="-26" width="20" height="25" rx="2" fill="#fff" stroke="${OUT}" stroke-width="1.8"/><rect x="1" y="-20" width="12" height="2.6" fill="#9AA4B5"/><rect x="1" y="-14" width="9" height="2.6" fill="#9AA4B5"/></g>`
    case 'mag':
      return `<g transform="${at}"><line x1="0" y1="1" x2="6" y2="-8" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/><circle cx="12" cy="-16" r="9" fill="rgba(190,225,245,.6)" stroke="${OUT}" stroke-width="3"/></g>`
    case 'laptop':
      return `<g transform="${at}"><rect x="-2" y="-22" width="26" height="18" rx="2" fill="#1D2333" stroke="${OUT}" stroke-width="1.8"/><rect x="2" y="-17" width="13" height="2.4" fill="#8FE3C0"/><rect x="2" y="-12" width="17" height="2.4" fill="#8FE3C0"/><rect x="-5" y="-4" width="32" height="5" rx="2" fill="#9AA4B5" stroke="${OUT}" stroke-width="1.8"/></g>`
    case 'box':
      return `<g transform="${at}"><rect x="-4" y="-22" width="28" height="22" rx="2" fill="#D7A56A" stroke="#8A5E2C" stroke-width="2"/><rect x="7" y="-22" width="6" height="22" fill="var(--err)"/></g>`
    case 'pen':
      return `<g transform="${at}"><rect x="-2" y="-16" width="5" height="16" rx="2" fill="var(--mustard)" stroke="${OUT}" stroke-width="1.5"/></g>`
    case 'sign':
      return `<g transform="${at}"><rect x="-6" y="-34" width="28" height="30" rx="5" fill="#fff" stroke="${OUT}" stroke-width="2"/><text x="8" y="-11" font-size="22" font-weight="800" text-anchor="middle" fill="var(--accent)">?</text></g>`
    default:
      return ''
  }
}

function bot(color: string, expr: string, propSvg: string): string {
  const sw = 'stroke="' + OUT + '" stroke-width="2.6"'
  const eyes =
    expr === 'sleep'
      ? `<path d="M-7 -53 h6 M6 -53 h6" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round"/>`
      : `<ellipse class="eye" cx="-4" cy="-53" rx="3.2" ry="4.3" fill="${OUT}"/><ellipse class="eye" cx="9" cy="-53" rx="3.2" ry="4.3" fill="${OUT}"/>`
  const mouth =
    expr === 'grin'
      ? 'M-4 -46 Q2.5 -38 9 -46'
      : expr === 'oops'
        ? 'M2.5 -47.2 a3.2 3.2 0 1 0 0.01 0'
        : expr === 'sleep'
          ? 'M-1 -44 L6 -44'
          : 'M-3 -45 Q2.5 -40.5 8 -45'
  return `<ellipse cx="0" cy="0" rx="26" ry="6" fill="var(--shadow)"/>
<g class="bd">
<g class="amL"><rect x="-34" y="-50" width="10" height="24" rx="5" fill="${color}" ${sw}/></g>
<rect class="lgL" x="-13" y="-22" width="10" height="22" rx="4" fill="${color}" ${sw}/>
<rect class="lgR" x="3" y="-22" width="10" height="22" rx="4" fill="${color}" ${sw}/>
<line x1="0" y1="-74" x2="0" y2="-86" ${sw}/>
<circle cx="0" cy="-90" r="5.5" fill="${color}" ${sw}/>
<rect x="-27" y="-74" width="54" height="56" rx="18" fill="${color}" ${sw}/>
<rect x="-16" y="-65" width="36" height="25" rx="9" fill="#fff" stroke="${OUT}" stroke-width="2"/>
${eyes}
<path d="${mouth}" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
<rect x="-9" y="-33" width="18" height="7" rx="3" fill="#fff" opacity=".55"/>
<g class="amR"><rect x="24" y="-50" width="10" height="24" rx="5" fill="${color}" ${sw}/>${propSvg}</g>
</g>`
}

const tf = (s: Spot, k: number) => `translate(${s.x}px,${s.y}px) scale(${k})`

function anim(sw: Swing | undefined, name: string): { kf: string; run: string } {
  if (!sw) return { kf: '', run: '' }
  return {
    kf: `@keyframes ${name}{from{transform:rotate(${sw.a}deg)}to{transform:rotate(${sw.b}deg)}}`,
    run: `${name} ${sw.d}s DELAY infinite ${sw.rev ? 'alternate-reverse' : 'alternate'} ease-in-out`,
  }
}

function minis(n: number): string {
  const colors = ['var(--teal)', 'var(--coral)', 'var(--mustard)']
  const stops: Spot[] = [SPOT.web, SPOT.docs, SPOT.app]
  const k = scaleAt(BACK) * 0.8
  let css = ''
  let svg = ''
  for (let i = 0; i < n; i++) {
    const p = [0, 1, 2].map(j => stops[(i + j) % 3] as Spot)
    const at = (s: Spot) => `translate(${s.x + 14}px,${s.y}px) scale(${k})`
    const [a, b, c] = p as [Spot, Spot, Spot]
    css += `@keyframes pt${i}{0%{transform:${at(a)}}22%{transform:${at(a)}}34%{transform:${at(b)}}56%{transform:${at(b)}}68%{transform:${at(c)}}90%{transform:${at(c)}}100%{transform:${at(a)}}}
.m${i}{animation:pt${i} 7s ${(-i * 2.3).toFixed(1)}s infinite ease-in-out}
.m${i} .lgL{animation:sw .28s infinite alternate}.m${i} .lgR{animation:sw .28s infinite alternate-reverse}
.m${i} .amR{animation:cr 1s infinite alternate}`
    svg += `<g class="m${i}">${bot(colors[i] ?? 'var(--teal)', 'happy', prop('paper', -150))}</g>`
  }
  return css && `<style>${css}@keyframes cr{from{transform:rotate(-150deg)}to{transform:rotate(-160deg)}}</style>${svg}`
}

export function sceneSVG(st: Stage): string {
  const to = SPOT[st.scene]
  const from = SPOT[st.from] ?? to
  const moved = from.x !== to.x || from.y !== to.y
  const D = moved ? 0.85 : 0
  const dir = moved ? (to.x >= from.x ? 1 : -1) : to.f
  const act = ACT[st.scene]
  const pose = act.R ? (act.R.a + act.R.b) / 2 : 0
  const R = anim(act.R, 'aR')
  const L = anim(act.L, 'aL')
  const walkR = moved ? `sw .28s 3 alternate ease-in-out` : ''
  const join = (...xs: string[]) => xs.filter(Boolean).join(',')
  const delay = `${D}s`
  const jump = act.jump
    ? `@keyframes jp{from{transform:translateY(0)}to{transform:translateY(-${act.jump}px)}}`
    : ''
  const bdRun = join(
    moved ? 'bob .14s 6 alternate' : '',
    act.jump ? `jp ${act.jd}s ${delay} infinite alternate ease-out` : `br 2.4s ${delay} infinite ease-in-out`,
    st.err ? `sh .07s ${delay} 8 alternate` : '',
  )
  const expr = st.err ? 'oops' : st.scene === 'idle' ? 'sleep' : st.scene === 'done' || st.scene === 'spawn' ? 'grin' : 'happy'
  const n = Math.min(st.subs, 3)
  const caption = CAPTION[st.scene] + (st.subs > 0 && st.scene !== 'spawn' ? `（分身×${st.subs}も作業中）` : '')
  const s = st.scene

  const css = `
svg{--bg:#E6EBF3;--floor:#D3DCE8;--line:#A7B2C3;--card:#fff;--ink:#1D2333;--muted:#596173;--out:#1D2333;--shadow:rgba(29,35,51,.16);--accent:#4B44C4;--teal:#17917B;--coral:#DE6246;--mustard:#D49B16;--ok:#2B9858;--err:#D3403A;font-family:'Hiragino Maru Gothic ProN','M PLUS Rounded 1c','Noto Sans CJK JP','Yu Gothic',sans-serif}
@media (prefers-color-scheme:dark){svg{--bg:#182032;--floor:#1F293D;--line:#3E4A63;--card:#262F44;--ink:#E8EBF2;--muted:#A0A8B8;--out:#141927;--shadow:rgba(0,0,0,.35);--accent:#8C85F2;--teal:#3DC2A6;--coral:#F08468;--mustard:#E8B43C;--ok:#4CC27E;--err:#F0625B}}
.lgL,.lgR,.amL,.amR,.cl,.mer,.flag{transform-box:fill-box}
.lgL,.lgR,.amL,.amR{transform-origin:50% 10%}
@keyframes sw{from{transform:rotate(-24deg)}to{transform:rotate(24deg)}}
@keyframes bob{to{transform:translateY(-3px)}}
@keyframes br{50%{transform:translateY(-1.5px)}}
@keyframes sh{from{transform:translateX(-2px)}to{transform:translateX(2px)}}
@keyframes mv{from{transform:${tf(from, scaleAt(from.y))}}to{transform:${tf(to, scaleAt(to.y))}}}
@keyframes fl{0%,99%{transform:scale(${dir},1)}100%{transform:scale(${to.f},1)}}
@keyframes pop{0%{transform:scale(0)}70%{transform:scale(1.25)}100%{transform:scale(1)}}
@keyframes up{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-30px);opacity:0}}
@keyframes typ{0%{transform:scaleX(0)}35%,100%{transform:scaleX(1)}}
@keyframes spin{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.08)}}
@keyframes fly{0%{transform:translate(0,0) rotate(0);opacity:0}15%{opacity:1}100%{transform:translate(-26px,-34px) rotate(200deg);opacity:0}}
@keyframes ck{from{stroke-dashoffset:16}to{stroke-dashoffset:0}}
@keyframes cf{0%{transform:translate(0,0) rotate(0)}45%{transform:translate(calc(var(--dx)*.6),var(--dy)) rotate(180deg)}100%{transform:translate(var(--dx),40px) rotate(420deg);opacity:0}}
@keyframes drift{from{transform:translateX(-40px)}to{transform:translateX(400px)}}
${R.kf}${L.kf}${jump}
.mv{animation:mv .85s ease-in-out forwards}
.fl{animation:fl .85s forwards}
.bd{animation:${bdRun}}
.ch .lgL{animation:${moved ? 'sw .28s 3 alternate ease-in-out' : 'none'}}
.ch .lgR{animation:${moved ? 'sw .28s 3 alternate-reverse ease-in-out' : 'none'}}
.ch .amR{animation:${join(walkR ? 'sw .28s 3 alternate-reverse ease-in-out' : '', R.run.replace('DELAY', delay)) || 'none'};animation-fill-mode:backwards}
.ch .amL{animation:${join(walkR, L.run.replace('DELAY', delay)) || 'none'}}
.mk{transform-box:fill-box;transform-origin:50% 100%;animation:pop .35s ${delay} both}
.z{animation:up 2.4s infinite}
.cl{transform-origin:0 50%;animation:typ 1.6s infinite}
.mer{transform-origin:50% 50%;animation:spin 1.8s linear infinite}
.fly{animation:fly 1.1s infinite}
.bit{animation:up 1.2s infinite}
.ckp{stroke-dasharray:16;stroke-dashoffset:16;animation:ck .4s forwards}
.cf{animation:cf 1.8s infinite ease-in}
.cloud{animation:drift 40s linear infinite}`

  const conf = Array.from({ length: 14 }, (_, i) => {
    const dx = Math.round(((i * 37) % 90) - 45)
    const dy = -Math.round(40 + ((i * 53) % 50))
    const c = ['var(--accent)', 'var(--teal)', 'var(--coral)', 'var(--mustard)'][i % 4]
    return `<rect class="cf" x="320" y="200" width="7" height="4" rx="1" fill="${c}" style="--dx:${dx}px;--dy:${dy}px;animation-delay:${(i * 0.13).toFixed(2)}s"/>`
  }).join('')

  const lines = [30, 40, 22, 36, 28]
    .map((w, i) => `<rect class="${s === 'run' ? 'cl' : ''}" x="234" y="${180 + i * 6}" width="${w}" height="3" rx="1.5" fill="${st.err && i === 2 ? '#FF7A70' : '#8FE3C0'}" style="animation-delay:${(i * 0.25).toFixed(2)}s"/>`)
    .join('')

  const checks = [0, 1, 2]
    .map(i => `<rect x="146" y="${186 + i * 12}" width="8" height="8" rx="1.5" fill="none" stroke="var(--line)" stroke-width="1.5"/><rect x="158" y="${188 + i * 12}" width="${[20, 16, 22][i]}" height="3" rx="1.5" fill="var(--line)"/>${s === 'plan' ? `<path class="ckp" d="M147 ${190 + i * 12} l3 3 l6 -7" fill="none" stroke="var(--ok)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="animation-delay:${(D + 0.3 + i * 0.5).toFixed(2)}s"/>` : ''}`)
    .join('')

  const mark =
    st.err ? `<text class="mk" x="22" y="-100" font-size="30" font-weight="800" fill="var(--err)">!</text><path d="M-31 -80 q-7 10 0 13 q7 -3 0 -13z" fill="#79BFEA" stroke="${OUT}" stroke-width="1.5"/>`
    : s === 'idle' ? `<g fill="var(--muted)" font-weight="800"><text class="z" x="20" y="-96" font-size="16">z</text><text class="z" x="30" y="-108" font-size="20" style="animation-delay:.8s">Z</text></g>`
    : s === 'plan' ? `<g transform="translate(26,-114)"><g class="mk"><circle r="10" fill="var(--mustard)" stroke="${OUT}" stroke-width="2"/><rect x="-5" y="9" width="10" height="6" rx="1" fill="#9AA4B5" stroke="${OUT}" stroke-width="1.5"/></g></g>`
    : s === 'done' || s === 'spawn' ? `<g class="mk" fill="var(--mustard)" stroke="${OUT}" stroke-width="1.2"><path transform="translate(-36,-96)" d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4Z"/><path transform="translate(36,-86)" d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4Z"/></g>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 300" width="360" height="300" class="s-${s}">
<style>${css}</style>
<rect width="360" height="300" fill="var(--bg)"/>
<g class="cloud" opacity=".7"><g fill="var(--card)"><circle cx="40" cy="40" r="14"/><circle cx="56" cy="34" r="17"/><circle cx="73" cy="41" r="12"/></g></g>
<g class="cloud" opacity=".7" style="animation-delay:-22s"><g fill="var(--card)"><circle cx="40" cy="70" r="10"/><circle cx="52" cy="65" r="13"/><circle cx="65" cy="71" r="9"/></g></g>
<polygon points="0,118 360,118 360,248 0,248" fill="var(--floor)"/>
<line x1="0" y1="118" x2="360" y2="118" stroke="var(--line)" stroke-width="1.5"/>

<line x1="84" y1="104" x2="84" y2="118" stroke="var(--line)" stroke-width="3"/>
<circle cx="84" cy="88" r="17" fill="var(--card)" stroke="var(--line)" stroke-width="2"/>
<ellipse class="${s === 'web' ? 'mer' : ''}" cx="84" cy="88" rx="7" ry="17" fill="none" stroke="var(--line)" stroke-width="1.6"/>
<line x1="67" y1="88" x2="101" y2="88" stroke="var(--line)" stroke-width="1.6"/>
${s === 'web' ? [0, 1, 2].map(i => `<g class="bit" style="animation-delay:${(i * 0.4).toFixed(1)}s"><rect x="${74 + i * 8}" y="62" width="18" height="12" rx="3" fill="var(--card)" stroke="var(--teal)" stroke-width="1.5"/></g>`).join('') : ''}
<g fill="var(--card)" stroke="var(--line)" stroke-width="1.6">
<rect x="168" y="106" width="34" height="11" rx="1.5" transform="rotate(-3 185 111)"/>
<rect x="166" y="95" width="36" height="11" rx="1.5" transform="rotate(4 184 100)"/>
<rect x="169" y="84" width="32" height="11" rx="1.5" transform="rotate(-2 185 90)"/>
<rect x="167" y="74" width="34" height="10" rx="1.5" transform="rotate(5 184 79)"/>
</g>
${s === 'docs' ? [0, 1, 2].map(i => `<rect class="fly" x="178" y="66" width="12" height="15" rx="1.5" fill="#fff" stroke="var(--coral)" stroke-width="1.4" style="transform-box:fill-box;animation-delay:${(i * 0.36).toFixed(2)}s"/>`).join('') : ''}
<g fill="var(--card)" stroke="var(--line)" stroke-width="1.8">
<path d="M266 76 v38 a18 6 0 0 0 36 0 v-38"/><ellipse cx="284" cy="76" rx="18" ry="6"/>
<path d="M266 89 a18 6 0 0 0 36 0 M266 102 a18 6 0 0 0 36 0" fill="none"/>
</g>
${s === 'app' ? [0, 1, 2, 3].map(i => `<rect class="bit" x="${276 + (i % 2) * 10}" y="60" width="6" height="6" rx="1.5" fill="var(--mustard)" stroke="${OUT}" stroke-width="1" style="animation-delay:${(i * 0.3).toFixed(1)}s"/>`).join('') : ''}
<g font-size="10" text-anchor="middle" fill="var(--muted)" font-weight="700"><text x="84" y="131">Web</text><text x="184" y="131">資料</text><text x="284" y="131">アプリ</text></g>

<rect x="45" y="200" width="9" height="32" fill="var(--line)"/>
<rect x="24" y="168" width="52" height="34" rx="11" fill="var(--card)" stroke="var(--line)" stroke-width="2"/>
<rect x="36" y="182" width="28" height="4" rx="2" fill="${OUT}"/>
<g class="flag" style="transform-origin:0 100%;transform:rotate(${s === 'recv' || s === 'ask' ? 0 : 90}deg)"><rect x="76" y="170" width="3" height="18" fill="${OUT}"/><rect x="76" y="170" width="12" height="7" rx="1" fill="var(--err)"/></g>

<line x1="146" y1="216" x2="140" y2="232" stroke="var(--line)" stroke-width="3"/><line x1="174" y1="216" x2="180" y2="232" stroke="var(--line)" stroke-width="3"/>
<rect x="138" y="172" width="46" height="46" rx="5" fill="var(--card)" stroke="var(--line)" stroke-width="2"/>
${checks}

<rect x="226" y="172" width="50" height="38" rx="4" fill="#1D2333" stroke="var(--line)" stroke-width="1.6"/>
${lines}
<rect x="247" y="210" width="8" height="8" fill="var(--line)"/>
<rect x="218" y="218" width="66" height="6" rx="2" fill="var(--line)"/>
<rect x="224" y="224" width="4" height="8" fill="var(--line)"/><rect x="274" y="224" width="4" height="8" fill="var(--line)"/>

<rect x="302" y="206" width="44" height="26" rx="3" fill="#D7A56A" stroke="#8A5E2C" stroke-width="2"/>
${s === 'done'
    ? `<rect x="302" y="201" width="44" height="5" fill="#C8955A" stroke="#8A5E2C" stroke-width="1.6"/><rect x="321" y="200" width="6" height="32" fill="var(--err)"/>`
    : `<rect x="302" y="201" width="22" height="5" fill="#C8955A" stroke="#8A5E2C" stroke-width="1.6" transform="rotate(-115 302 206)"/><rect x="324" y="201" width="22" height="5" fill="#C8955A" stroke="#8A5E2C" stroke-width="1.6" transform="rotate(115 346 206)"/>`}
${s === 'done' ? conf : ''}

<g font-size="10" text-anchor="middle" fill="var(--muted)" font-weight="700"><text x="50" y="244">受付</text><text x="161" y="244">計画</text><text x="251" y="244">実行</text><text x="324" y="244">納品</text></g>

${minis(n)}
<g class="ch mv"><g class="fl">${bot('var(--accent)', expr, prop(act.prop, pose))}</g>${mark ? `<g>${mark}</g>` : ''}</g>

<rect x="12" y="256" width="336" height="34" rx="17" fill="var(--card)" stroke="var(--line)" stroke-width="1.2"/>
<text x="${st.tool ? 26 : 180}" y="278" font-size="14" font-weight="700" text-anchor="${st.tool ? 'start' : 'middle'}" fill="var(--ink)">${esc(caption)}</text>
${st.tool ? `<text x="336" y="278" font-size="10" text-anchor="end" fill="var(--muted)">${esc(shortTool(st.tool))}</text>` : ''}
</svg>`
}

function shortTool(t: string): string {
  const s = (t.startsWith('mcp__') ? t.split('__').pop() : t) ?? t
  return s.length > 18 ? s.slice(0, 17) + '…' : s
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
}
