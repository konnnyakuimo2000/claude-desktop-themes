// Digital Rain: columns of green glyphs falling from the top of a dark screen.
// Each column is one drop: a bright head and a trail that fades to dark green behind it.
// A column's glyphs are a few <text> elements (one per shade) with a y for every glyph,
// and the column slides down a glyph at a time, so the whole sky stays cheap to draw.

const W = 1600
const H = 1000
const CELL = 22

// letters and digits only
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz0123456789'

/** A fixed stand-in for randomness, so every build draws the same rain. */
function noise(a: number, b: number, seed: number): number {
  let h = Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(seed, 83492791)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const SHADES: readonly { fill: string; upTo: number }[] = [
  { fill: '#f4fff6', upTo: 1 }, // the head
  { fill: '#a6ffbc', upTo: 3 },
  { fill: '#3ee070', upTo: 8 },
  { fill: '#22a84e', upTo: 14 },
  { fill: '#13722f', upTo: 20 },
  { fill: '#0b4a1f', upTo: Infinity },
]

type Column = { x: number; size: number; length: number; delay: number; dim: number }

function columns(): Column[] {
  const out: Column[] = []
  // a near layer of larger glyphs and a far layer of smaller, dimmer ones between them
  for (let i = 0; i < 24; i++) {
    out.push({
      x: 24 + i * 66,
      size: 18,
      length: 10 + Math.floor(noise(i, 1, 3) * 10),
      delay: noise(i, 2, 3),
      dim: 1,
    })
    out.push({
      x: 57 + i * 66,
      size: 13,
      length: 7 + Math.floor(noise(i, 4, 3) * 7),
      delay: noise(i, 5, 3),
      dim: 0.5,
    })
  }
  return out
}

function columnSvg(col: Column, index: number): { svg: string; css: string } {
  const step = col.size === 18 ? CELL : 16
  // the trail sits above the head; y grows downward, the head is the last glyph
  const byShade: { chars: string; ys: number[] }[] = SHADES.map(() => ({ chars: '', ys: [] }))
  let changing = ''
  for (let k = 0; k < col.length; k++) {
    const fromHead = col.length - 1 - k
    const shade = SHADES.findIndex(s => fromHead < s.upTo)
    const glyph = GLYPHS[Math.floor(noise(index, k, 17) * GLYPHS.length)]!
    const y = k * step
    // a few trail glyphs swap with another glyph every few seconds
    if (col.size === 18 && fromHead > 1 && noise(index, k, 23) < 0.14) {
      const other = GLYPHS[Math.floor(noise(index, k, 29) * GLYPHS.length)]!
      const fill = SHADES[shade]!.fill
      const delay = (noise(index, k, 31) * 4).toFixed(1)
      changing +=
        `<text class="swap-a" style="animation-delay:-${delay}s" x="${col.x}" y="${y}" fill="${fill}">${glyph}</text>` +
        `<text class="swap-b" style="animation-delay:-${delay}s" x="${col.x}" y="${y}" fill="${fill}" opacity="0">${other}</text>`
      continue
    }
    const slot = byShade[shade]!
    slot.chars += glyph
    slot.ys.push(y)
  }
  const texts = byShade
    .map((slot, i) =>
      slot.chars === ''
        ? ''
        : `<text x="${slot.ys.map(() => col.x).join(' ')}" y="${slot.ys.join(' ')}" fill="${SHADES[i]!.fill}">${slot.chars}</text>`,
    )
    .join('') + changing
  // a soft glow behind the head, the brightest glyph
  const headY = (col.length - 1) * step - col.size * 0.35
  const glow = `<ellipse cx="${col.x}" cy="${headY.toFixed(1)}" rx="${col.size * 0.9}" ry="${col.size * 1.1}" fill="url(#dr-head)"/>`
  // fall from fully above the top to fully below the bottom, a glyph per step
  const top = -(col.length * step)
  const distance = H + col.length * step + step
  const steps = Math.round(distance / step)
  // a step every 1.0 to 1.4 s near, 1.35 to 1.95 s far: an unhurried fall
  const perStep = (col.size === 18 ? 1.0 : 1.35) + noise(index, 9, 3) * (col.size === 18 ? 0.4 : 0.6)
  const seconds = (steps * perStep).toFixed(1)
  const delay = (col.delay * steps * perStep).toFixed(1)
  const name = `fall-${index}`
  const css = `.${name}{animation:${name} ${seconds}s steps(${steps}) -${delay}s infinite}@keyframes ${name}{from{transform:translateY(${top}px)}to{transform:translateY(${top + distance}px)}}`
  const middle = col.x > 380 && col.x < 1150
  const opacity = (col.dim * (middle ? 0.5 : 1)).toFixed(2)
  // where the column rests without motion: as far down as its delay puts it at the start
  const rest = top + Math.round(col.delay * steps) * step
  const svg = `<g class="${name}" transform="translate(0 ${rest})" opacity="${opacity}" font-size="${col.size}">${glow}${texts}</g>`
  return { svg, css }
}

export function rainSvg(): string {
  const parts = columns().map(columnSvg)
  const style = `
${parts.map(p => p.css).join('\n')}
.swap-a{animation:swap-a 4s steps(1) infinite}
.swap-b{animation:swap-b 4s steps(1) infinite}
@keyframes swap-a{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes swap-b{0%,49%{opacity:0}50%,100%{opacity:1}}
@media (prefers-reduced-motion: reduce){*{animation:none!important}.swap-b{opacity:0}}`

  const defs = `<linearGradient id="dr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#010402"/><stop offset="1" stop-color="#03120a"/></linearGradient>
<radialGradient id="dr-glow" cx="0.5" cy="1" r="0.8"><stop offset="0" stop-color="#0d3a1c" stop-opacity="0.5"/><stop offset="1" stop-color="#0d3a1c" stop-opacity="0"/></radialGradient>
<radialGradient id="dr-head" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#7dffa0" stop-opacity="0.55"/><stop offset="1" stop-color="#7dffa0" stop-opacity="0"/></radialGradient>
<radialGradient id="dr-vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></radialGradient>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" font-family="monospace" text-anchor="middle"><style>${style}</style><defs>${defs}</defs>
<rect width="${W}" height="${H}" fill="url(#dr-sky)"/>
<rect width="${W}" height="${H}" fill="url(#dr-glow)"/>
${parts.map(p => p.svg).join('\n')}
<rect width="${W}" height="${H}" fill="url(#dr-vignette)"/>
</svg>`
}
