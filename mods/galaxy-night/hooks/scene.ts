// Block Space: a night sky built from small shaded blocks on one grid.
// The Sun (top left), a black hole (top right), the Earth and its Moon (right),
// a ringed planet (bottom right), a spiral galaxy (bottom left), a drifting nebula (left),
// twinkling stars, and a comet that crosses the top now and then.
//
// Every object is painted as runs of cells; one grid mask over them cuts the hairline
// gaps that make the blocks, so the SVG stays small however fine the grid is.

const BW = 12
const BH = 10
const W = 1600
const H = 1000

type Cell = { c: number; r: number }

/** A fixed stand-in for randomness, so every build draws the same sky. */
function noise(a: number, b: number, seed: number): number {
  let h = Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(seed, 83492791)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Smooth value noise in 0..1, for coastlines, clouds and dust. */
function smooth(x: number, y: number, scale: number, seed: number): number {
  const gx = x / scale
  const gy = y / scale
  const x0 = Math.floor(gx)
  const y0 = Math.floor(gy)
  const ease = (t: number) => t * t * (3 - 2 * t)
  const u = ease(gx - x0)
  const v = ease(gy - y0)
  const a = noise(x0, y0, seed)
  const b = noise(x0 + 1, y0, seed)
  const c = noise(x0, y0 + 1, seed)
  const d = noise(x0 + 1, y0 + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Cells as horizontal runs: one subpath per run of neighbours in a row. */
function runs(list: readonly Cell[], sw = BW, sh = BH): string {
  const rows = new Map<number, Set<number>>()
  for (const { c, r } of list) {
    let row = rows.get(r)
    if (row === undefined) {
      row = new Set()
      rows.set(r, row)
    }
    row.add(c)
  }
  let d = ''
  for (const [r, set] of rows) {
    const cols = [...set].sort((a, b) => a - b)
    let start = cols[0]!
    let prev = start
    const flush = () => {
      const w = (prev - start + 1) * sw
      d += `M${start * sw} ${r * sh}h${w}v${sh}h-${w}z`
    }
    for (let i = 1; i < cols.length; i++) {
      const c = cols[i]!
      if (c === prev + 1) prev = c
      else {
        flush()
        start = c
        prev = c
      }
    }
    flush()
  }
  return d
}

/** Cells grouped by color, painted in the order the colors first appear. */
class Paint {
  private readonly layers = new Map<string, Cell[]>()

  constructor(private readonly sw = BW, private readonly sh = BH) {}

  add(color: string, cell: Cell): void {
    let list = this.layers.get(color)
    if (list === undefined) {
      list = []
      this.layers.set(color, list)
    }
    list.push(cell)
  }

  svg(order?: readonly string[]): string {
    const colors = order ?? [...this.layers.keys()]
    return colors
      .map(color => {
        const list = this.layers.get(color)
        return list === undefined || list.length === 0 ? '' : `<path d="${runs(list, this.sw, this.sh)}" fill="${color}"/>`
      })
      .join('')
  }
}

/** Visits every cell whose centre lies in the box, with that centre. */
function each(x0: number, y0: number, x1: number, y1: number, visit: (cell: Cell, x: number, y: number) => void): void {
  const r0 = Math.max(0, Math.floor(y0 / BH))
  const r1 = Math.min(Math.ceil(H / BH), Math.ceil(y1 / BH))
  for (let r = r0; r <= r1; r++) {
    for (let c = Math.floor(x0 / BW); c <= Math.ceil(x1 / BW); c++) {
      visit({ c, r }, c * BW + BW / 2, r * BH + BH / 2)
    }
  }
}

const LIGHT = (() => {
  const v = [-0.55, -0.6, 0.58]
  const n = Math.hypot(v[0]!, v[1]!, v[2]!)
  return v.map(x => x / n) as [number, number, number]
})()

/** 0 (shade) to 3 (lit) for a point on a sphere lit from the upper left. */
function sphereTone(dx: number, dy: number, radius: number): number {
  const nx = dx / radius
  const ny = dy / radius
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
  const lit = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]
  return lit > 0.72 ? 3 : lit > 0.42 ? 2 : lit > 0.1 ? 1 : 0
}

/** Value noise that wraps every `period` px across, so a scrolling surface has no seam. */
function tiled(u: number, y: number, scale: number, seed: number, period: number): number {
  const w = u / period
  return smooth(u, y, scale, seed) * (1 - w) + smooth(u - period, y, scale, seed) * w
}

/** Shade laid over a scrolling sphere: darker away from the light, a sheen where it is lit. */
function sphereShade(cells: readonly Cell[][]): string {
  const looks: readonly [string, number][] = [['#020414', 0.62], ['#020414', 0.34], ['#020414', 0.1], ['#ffffff', 0.12]]
  return cells
    .map((list, tone) => (list.length === 0 ? '' : `<path d="${runs(list)}" fill="${looks[tone]![0]}" opacity="${looks[tone]![1]}"/>`))
    .join('')
}

/** Wraps markup so a CSS rotation turns it about (cx, cy), with no transform-box. */
function pivot(cx: number, cy: number, cls: string, inner: string): string {
  return `<g transform="translate(${cx} ${cy})"><g class="${cls}"><g transform="translate(${-cx} ${-cy})">${inner}</g></g></g>`
}

// ── stars ──────────────────────────────────────────────────────────────
function stars(): string {
  const groups = [new Paint(), new Paint(), new Paint(), new Paint(), new Paint()]
  for (let i = 0; i < 150; i++) {
    const x = noise(i, 1, 9) * W
    const y = noise(i, 2, 9) * H * 0.92
    const middle = x > 380 && x < 1100
    if (middle && noise(i, 6, 9) < 0.5) continue
    const c = Math.floor(x / BW)
    const r = Math.floor(y / BH)
    const warm = i % 7 === 3
    const bright = noise(i, 3, 9) < 0.18 && !middle
    const color = warm ? '#ffe08a' : middle ? '#8890c0' : '#dfe4ff'
    const g = groups[i % 5]!
    g.add(color, { c, r })
    if (bright) {
      const arm = warm ? '#c8a860' : '#8f9ad0'
      g.add(arm, { c: c - 1, r })
      g.add(arm, { c: c + 1, r })
      g.add(arm, { c, r: r - 1 })
      g.add(arm, { c, r: r + 1 })
    }
  }
  const periods = [7, 11, 13, 17, 19]
  return groups
    .map((g, i) => `<g class="tw" style="animation-duration:${periods[i]}s;animation-delay:-${i * 3}s">${g.svg()}</g>`)
    .join('')
}

// ── the Sun, top left: its corona turns slowly ─────────────────────────
function sun(): string {
  const cx = 190
  const cy = 165
  const R = 84
  const disk = new Paint()
  const rim = new Paint()
  const rays = new Paint()
  each(cx - R - 70, cy - R - 70, cx + R + 70, cy + R + 70, (cell, x, y) => {
    const dx = x - cx
    const dy = y - cy
    const d = Math.hypot(dx, dy)
    if (d <= R) {
      const k = d / R
      const spot = k < 0.8 && smooth(x, y, 14, 5) > 0.78
      const color = spot ? '#f0a030' : k < 0.42 ? '#fff7d6' : k < 0.68 ? '#ffe27a' : k < 0.88 ? '#ffbd46' : '#f78a2e'
      disk.add(color, cell)
    } else if (d <= R + 10) rim.add('#ff9a3a', cell)
    else if (d <= R + 62) {
      const angle = Math.atan2(dy, dx)
      const ray = Math.cos(angle * 6) * 0.6 + Math.cos(angle * 11 + 1) * 0.4
      const reach = R + 18 + Math.max(0, ray) * 46
      if (d <= reach) rays.add(d < R + 30 ? '#ffb347' : '#e07a30', cell)
    }
  })
  return (
    `<g class="corona">${pivot(cx, cy, 'turn-sun', rays.svg(['#e07a30', '#ffb347']))}</g>` +
    `<g class="glow">${rim.svg()}</g>` +
    disk.svg(['#f78a2e', '#ffbd46', '#ffe27a', '#fff7d6', '#f0a030'])
  )
}

// ── the Earth turning, and its Moon going round ────────────────────────
const EARTH = { cx: 1440, cy: 535, R: 70, period: 288 }
const MOON_ORBIT = { rx: 135, ry: 112 }

function earth(): string {
  const { cx, cy, R, period } = EARTH
  const disk: Cell[] = []
  const tones: Cell[][] = [[], [], [], []]
  const air = new Paint()
  each(cx - R - 16, cy - R - 16, cx + R + 16, cy + R + 16, (cell, x, y) => {
    const dx = x - cx
    const dy = y - cy
    const d = Math.hypot(dx, dy)
    if (d <= R) {
      disk.push(cell)
      tones[sphereTone(dx, dy, R)]!.push(cell)
    } else if (d <= R + 7) air.add('#5aa8ff', cell)
    else if (d <= R + 13) air.add('#24489a', cell)
  })
  // the surface, one turn and a disk wide, slides right a cell at a time and wraps
  const surface = new Paint()
  each(cx - R - period - BW, cy - R, cx + R + BW, cy + R, (cell, x, y) => {
    const u = (((x - (cx - R)) % period) + period) % period
    const ny = Math.abs(y - cy) / R
    const h = tiled(u, y, 30, 11, period) * 0.7 + tiled(u, y, 13, 12, period) * 0.3
    const clouds = tiled(u, y, 16, 21, period) > 0.74
    const color =
      ny > 0.84 ? '#eef4ff' : clouds ? '#e2eaf8' : h > 0.56 ? (h > 0.72 && ny < 0.45 ? '#b8975a' : '#4a933e') : '#1d5cb0'
    surface.add(color, cell)
  })
  const clip = `<clipPath id="bs-earth-clip"><path d="${runs(disk)}"/></clipPath>`
  const globe = `<g clip-path="url(#bs-earth-clip)"><g class="turn-earth">${surface.svg()}</g>${sphereShade(tones)}</g>`

  const moonP = new Paint()
  const mx = cx + MOON_ORBIT.rx
  const my = cy
  const mR = 20
  each(mx - mR, my - mR, mx + mR, my + mR, (cell, x, y) => {
    const dx = x - mx
    const dy = y - my
    if (dx * dx + dy * dy > mR * mR) return
    const tone = sphereTone(dx, dy, mR)
    const pit = tone > 0 && smooth(x, y, 9, 41) > 0.74
    moonP.add(pit ? '#6a7196' : ['#3e4462', '#7a82a8', '#9aa2c4', '#c8cfe8'][tone]!, cell)
  })
  return `${clip}<g class="air">${air.svg(['#24489a', '#5aa8ff'])}</g>${globe}<g class="orbit">${moonP.svg()}</g>`
}

/** The Moon's round, as keyframes that step it along an ellipse about the Earth. */
function orbitKeyframes(): string {
  const steps = 16
  let frames = ''
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const x = MOON_ORBIT.rx * Math.cos(a) - MOON_ORBIT.rx
    const y = -MOON_ORBIT.ry * Math.sin(a)
    frames += `${((i / steps) * 100).toFixed(2)}%{transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px)}`
  }
  return `@keyframes orbit{${frames}}`
}

// ── spiral galaxy, bottom left: drawn face-on, tilted into place, turning slowly ──
function galaxy(): string {
  const Rg = 250
  const step = 7
  const p = new Paint(step, step)
  const glints = [new Paint(step, step), new Paint(step, step), new Paint(step, step)]
  for (let v = -252; v <= Rg; v += step) {
    for (let u = -252; u <= Rg; u += step) {
      const r = Math.hypot(u + step / 2, v + step / 2) / Rg
      if (r > 1) continue
      const th = Math.atan2(v + step / 2, u + step / 2)
      const arm = Math.cos(2 * (th - 2.4 * Math.log(r + 0.06)))
      const core = Math.exp((-r * r) / 0.014)
      const b = core * 1.25 + Math.max(0, arm) ** 1.6 * (1 - r) * 0.85 + (1 - r) ** 2 * 0.28 + (smooth(u, v, 22, 61) - 0.5) * 0.16
      const cell = { c: u / step, r: v / step }
      if (b > 0.46 && noise(u, v, 62) < 0.03) {
        glints[Math.abs(u + v) % 3]!.add('#ffffff', cell)
        // the glint lies over its own cell, which keeps its color underneath
      }
      const color =
        b > 0.95 ? '#fff4dc' : b > 0.66 ? '#f0d0ff' : b > 0.46 ? '#b48cff' : b > 0.3 ? '#7656d0' : b > 0.17 ? '#46338a' : b > 0.09 ? '#2a2060' : ''
      if (color !== '') p.add(color, cell)
    }
  }
  const shine = glints
    .map((g, i) => `<g class="glint" style="animation-delay:-${(i * 2.7).toFixed(1)}s">${g.svg()}</g>`)
    .join('')
  const body = `${p.svg(['#2a2060', '#46338a', '#7656d0', '#b48cff', '#f0d0ff', '#fff4dc'])}${shine}`
  return `<g transform="translate(300 800) rotate(-20) scale(1 0.42)"><g class="turn-galaxy">${body}</g></g>`
}

// ── nebula, left middle, drifting a little ─────────────────────────────
function nebula(): string {
  const blobs = [
    { x: 110, y: 520, rx: 150, ry: 60 },
    { x: 60, y: 480, rx: 70, ry: 50 },
    { x: 190, y: 495, rx: 60, ry: 38 },
    { x: 250, y: 535, rx: 70, ry: 30 },
  ]
  const set = new Set<string>()
  each(-80, 400, 360, 620, (cell, x, y) => {
    const wobble = (smooth(x, y, 12, 31) - 0.5) * 0.35
    if (blobs.some(b => ((x - b.x) / b.rx) ** 2 + ((y - b.y) / b.ry) ** 2 <= 1 + wobble)) set.add(`${cell.c},${cell.r}`)
  })
  const p = new Paint()
  const top = new Paint()
  for (const k of set) {
    const [c, r] = k.split(',').map(Number) as [number, number]
    const cell = { c, r }
    if (!set.has(`${c},${r - 1}`)) top.add('#d27ad8', cell)
    else if (!set.has(`${c},${r + 1}`)) p.add('#2a1450', cell)
    else if (!set.has(`${c},${r - 2}`)) p.add('#8a48c8', cell)
    else if (!set.has(`${c},${r - 4}`) || noise(c, r, 7) < 0.12) p.add('#6a34a8', cell)
    else p.add('#4a2380', cell)
  }
  return `<g class="drift">${p.svg(['#2a1450', '#4a2380', '#6a34a8', '#8a48c8'])}${top.svg()}</g>`
}

// ── ringed planet, bottom right: its bands and a storm drift round ─────
function planet(): string {
  const cx = 1390
  const cy = 820
  const R = 104
  const rx = 205
  const ry = 40
  const period = 360
  const back = new Paint()
  const front = new Paint()
  const disk: Cell[] = []
  const tones: Cell[][] = [[], [], [], []]
  each(cx - rx - 10, cy - R - 10, cx + rx + 10, cy + R + 10, (cell, x, y) => {
    const dx = x - cx
    const dy = y - cy
    const inside = dx * dx + dy * dy <= R * R
    const ty = dy + dx * 0.12
    const e = (dx * dx) / (rx * rx) + (ty * ty) / (ry * ry)
    const ring = e > 0.6 && e <= 1
    if (ring && ty >= 0) {
      front.add(e > 0.85 ? '#e8d4ff' : '#b99ad8', cell)
      return
    }
    if (inside) {
      disk.push(cell)
      tones[sphereTone(dx, dy, R)]!.push(cell)
      return
    }
    if (ring) back.add('#5c4a8e', cell)
  })
  const surface = new Paint()
  each(cx - R - period - BW, cy - R, cx + R + BW, cy + R, (cell, x, y) => {
    const u = (((x - (cx - R)) % period) + period) % period
    const dy = y - cy
    const band = Math.floor((dy / R + 1) * 8 + (tiled(u, y, 18, 4, period) - 0.5) * 1.2) % 2
    const su = Math.min(Math.abs(u - 120), period - Math.abs(u - 120))
    const storm = (su / 34) ** 2 + ((dy - 30) / 14) ** 2
    const color = storm <= 1 ? (storm <= 0.45 ? '#f0a0b0' : '#c86a8a') : band === 0 ? '#5040b4' : '#9a4c98'
    surface.add(color, cell)
  })
  const clip = `<clipPath id="bs-planet-clip"><path d="${runs(disk)}"/></clipPath>`
  const globe = `<g clip-path="url(#bs-planet-clip)"><g class="turn-planet">${surface.svg()}</g>${sphereShade(tones)}</g>`
  return clip + back.svg() + globe + front.svg(['#b99ad8', '#e8d4ff'])
}

// ── black hole, top right ──────────────────────────────────────────────
function blackHole(): string {
  const cx = 1330
  const cy = 210
  const core = 62
  const photon = 74
  const halo = 98
  const rx = 245
  const ry = 34
  const disk = ['#fff1c4', '#ffc061', '#f07a3e', '#8a2f45']
  const backTones = ['#e9b884', '#c8783f', '#94452c', '#4f1d33']
  const back = new Paint()
  const haloP = new Paint()
  const coreP = new Paint()
  const front = new Paint()
  const glints = [new Paint(), new Paint(), new Paint(), new Paint(), new Paint()]
  each(cx - rx - 10, cy - halo - 10, cx + rx + 10, cy + halo + 10, (cell, x, y) => {
    const dx = x - cx
    const dy = y - cy
    const d = Math.hypot(dx, dy)
    const ty = dy + dx * 0.08
    const e = (dx * dx) / (rx * rx) + (ty * ty) / (ry * ry)
    const tone = e < 0.25 ? 0 : e < 0.5 ? 1 : e < 0.78 ? 2 : 3
    if (e <= 1 && ty >= 0) {
      front.add(disk[tone]!, cell)
      if (tone < 3 && noise(cell.c, cell.r, 77) < 0.35) {
        glints[Math.floor((Math.atan2(ty, dx) + Math.PI) * 3 + cell.c * 0.15) % 5]!.add('#fffaf0', cell)
      }
    } else if (d <= core) coreP.add('#030208', cell)
    else if (d <= photon) coreP.add('#ffe7b8', cell)
    else if (d <= halo) {
      const hot = Math.cos(Math.atan2(dy, dx) * 3) > 0.55
      haloP.add(d <= (photon + halo) / 2 ? (hot ? '#ffe0a8' : '#ffb26b') : hot ? '#e07a40' : '#b8582f', cell)
    }
    else if (e <= 1) back.add(backTones[tone]!, cell)
  })
  const shine = glints
    .map((g, i) => `<g class="glint" style="animation-delay:-${(i * 1.6).toFixed(1)}s">${g.svg()}</g>`)
    .join('')
  return (
    back.svg(backTones) +
    `<g class="halo">${pivot(cx, cy, 'turn-halo', haloP.svg(['#b8582f', '#e07a40', '#ffb26b', '#ffe0a8']))}</g>` +
    coreP.svg(['#030208', '#ffe7b8']) +
    front.svg([...disk].reverse()) +
    shine
  )
}

// ── comet, crossing the top toward the Sun now and then ─────────────────
function comet(): string {
  const hx = 1150
  const hy = 72
  // the tail points away from the Sun
  const ax = hx - 190
  const ay = hy - 165
  const len = Math.hypot(ax, ay)
  const ux = ax / len
  const uy = ay / len
  const tailLen = 280
  const p = new Paint()
  each(hx - 20, hy - 40, hx + tailLen + 20, hy + 40, (cell, x, y) => {
    const dx = x - hx
    const dy = y - hy
    const d = Math.hypot(dx, dy)
    if (d <= 13) {
      p.add(d <= 7 ? '#ffffff' : '#bfe8ff', cell)
      return
    }
    const t = dx * ux + dy * uy
    const w = Math.abs(-dx * uy + dy * ux)
    if (t <= 0 || t > tailLen || w > 9 + t * 0.1) return
    const k = t / tailLen + (w / (9 + t * 0.1)) * 0.25
    if (k > 0.85 && noise(cell.c, cell.r, 90) < 0.5) return
    const color = k < 0.12 ? '#e6f6ff' : k < 0.3 ? '#a8d8f8' : k < 0.55 ? '#6aa4e0' : k < 0.8 ? '#406fb8' : '#2a4888'
    p.add(color, cell)
  })
  return `<g class="comet">${p.svg(['#2a4888', '#406fb8', '#6aa4e0', '#a8d8f8', '#e6f6ff', '#bfe8ff', '#ffffff'])}</g>`
}

export function blockSpaceSvg(): string {
  const style = `
.tw{animation:tw 9s steps(2) infinite}
@keyframes tw{0%,100%{opacity:1}50%{opacity:.4}}
.glint{opacity:0;animation:glint 8s ease-in-out infinite}
@keyframes glint{0%,35%,100%{opacity:0}15%{opacity:.9}}
.halo{animation:pulse 10s ease-in-out infinite}
.corona{animation:pulse 7s ease-in-out infinite}
.air{animation:pulse 12s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.65}}
.drift{animation:drift 96s steps(16) -48s infinite alternate}
@keyframes drift{from{transform:translateX(-48px)}to{transform:translateX(48px)}}
.comet{opacity:0;animation:comet 34s linear infinite}
@keyframes comet{0%,60%{opacity:0;transform:translate(0,0)}61%{opacity:1;transform:translate(0,0)}86%{opacity:1;transform:translate(-660px,110px)}87%,100%{opacity:0;transform:translate(-660px,110px)}}
.turn-earth{animation:slide-earth 96s steps(24) infinite}
@keyframes slide-earth{from{transform:translateX(0)}to{transform:translateX(288px)}}
.turn-planet{animation:slide-planet 150s steps(30) infinite}
@keyframes slide-planet{from{transform:translateX(0)}to{transform:translateX(360px)}}
.orbit{animation:orbit 96s steps(6) infinite}
${orbitKeyframes()}
.turn-sun{animation:spin 180s steps(90) infinite}
.turn-halo{animation:spin 60s steps(60) infinite}
.turn-galaxy{animation:spin-back 300s steps(150) infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes spin-back{to{transform:rotate(-360deg)}}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}`

  const defs = `<linearGradient id="bs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060820"/><stop offset="0.55" stop-color="#0d1140"/><stop offset="1" stop-color="#181250"/></linearGradient>
<radialGradient id="bs-sunglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffb347" stop-opacity="0.35"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
<radialGradient id="bs-diskglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff8a3a" stop-opacity="0.22"/><stop offset="1" stop-color="#ff8a3a" stop-opacity="0"/></radialGradient>
<radialGradient id="bs-earthglow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#4a8fff" stop-opacity="0.18"/><stop offset="1" stop-color="#4a8fff" stop-opacity="0"/></radialGradient>
<pattern id="bs-cells" width="${BW}" height="${BH}" patternUnits="userSpaceOnUse"><rect x="0.5" y="0.5" width="${BW - 1}" height="${BH - 1}" fill="#fff"/></pattern>
<mask id="bs-grid" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#bs-cells)"/></mask>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><style>${style}</style><defs>${defs}</defs>
<rect width="${W}" height="${H}" fill="url(#bs-sky)"/>
<circle cx="190" cy="165" r="260" fill="url(#bs-sunglow)"/>
<ellipse cx="1330" cy="210" rx="320" ry="150" fill="url(#bs-diskglow)"/>
<circle cx="1440" cy="535" r="130" fill="url(#bs-earthglow)"/>
<g mask="url(#bs-grid)">
${stars()}
${nebula()}
${galaxy()}
${sun()}
${blackHole()}
${earth()}
${planet()}
${comet()}
</g>
</svg>`
}
