// Event Horizon: a giant black hole and its accretion disk, drawn only in round dots.
// A halftone screen of dots whose size follows the light: a black shadow, a thin photon ring,
// the lensed glow of the far side of the disk arching over it, and the near side of the disk
// crossing in front, brighter on the side that turns toward us. Bright clumps in the disk go
// round, a frame at a time, and a few stars twinkle in the dark. The halftone itself stays still:
// it holds thousands of dots, and redrawing them all every frame makes the app hold the scene still.
//
// Each dot is a zero-length line with a round cap, so a few thousand dots stay small.

const W = 1600
const H = 1000

const CX = 1040
const CY = 430
const SHADOW = 150 // radius of the black shadow
const PHOTON = 166 // the photon ring runs from SHADOW to PHOTON
const TILT = 0.085 // how flat the disk looks: its height over its width (nearly edge-on)
const LEAN = (-7 * Math.PI) / 180 // the disk leans a little
const R_IN = 205 // inner edge of the disk, in the disk's own plane
const R_OUT = 1100

const GRID = 13 // spacing of the halftone screen
const MAX_DOT = 6.2 // largest dot radius

/** A fixed stand-in for randomness, so every build draws the same picture. */
function noise(a: number, b: number, seed: number): number {
  let h = Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(seed, 83492791)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h ^= h >>> 13
  h = Math.imul(h, 3266489909)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** From the screen to the disk's plane: u along the disk, v across it (unsquashed). */
function toDisk(x: number, y: number): { u: number; v: number } {
  const dx = x - CX
  const dy = y - CY
  const c = Math.cos(LEAN)
  const s = Math.sin(LEAN)
  return { u: dx * c + dy * s, v: (-dx * s + dy * c) / TILT }
}

/** From the disk's plane back to the screen. */
function toScreen(u: number, v: number): { x: number; y: number } {
  const c = Math.cos(LEAN)
  const s = Math.sin(LEAN)
  const vs = v * TILT
  return { x: CX + u * c - vs * s, y: CY + u * s + vs * c }
}

/** The disk's own light at a point of its plane: hot inside, fading out, brighter on the side coming toward us. */
function diskLight(u: number, v: number): number {
  const r = Math.hypot(u, v)
  if (r < R_IN || r > R_OUT) return 0
  const fall = (R_IN / r) ** 1.25
  const beaming = 1 + 0.55 * (-u / r) // the left side turns toward us
  const rings = 1 + 0.22 * Math.sin(r / 11) + 0.12 * Math.sin(r / 4.3 + 1)
  const edge = Math.min(1, (r - R_IN) / 18)
  return fall * beaming * rings * edge
}

/** How bright the picture is at a screen point, 0 and up. */
function light(x: number, y: number): number {
  const dx = x - CX
  const dy = y - CY
  const d = Math.hypot(dx, dy)
  const { u, v } = toDisk(x, y)
  const nearSide = v > 0
  const disk = diskLight(u, v)
  // the near side of the disk passes in front of everything
  if (nearSide && disk > 0) return disk
  if (d < SHADOW) return 0
  if (d < PHOTON) return 1.25 + 0.25 * (-dx / d)
  // the far side of the disk, bent by gravity into a glow that arches over the top and under the bottom
  const over = dy < 0 ? 1 : 0.6
  const halo = Math.exp(-(d - PHOTON) / 58) * 1.1 * over * (1 + 0.35 * (-dx / d))
  return Math.max(halo, disk * 0.8)
}

const INKS = ['#4a1830', '#8a2c34', '#d0542c', '#ff8f3c', '#ffc673', '#fff3d6'] as const

function inkOf(b: number): string {
  return b > 1.05 ? INKS[5] : b > 0.7 ? INKS[4] : b > 0.45 ? INKS[3] : b > 0.27 ? INKS[2] : b > 0.15 ? INKS[1] : INKS[0]
}

/** Dots grouped by ink and size, each group one path of zero-length strokes with round caps. */
class Dots {
  private readonly groups = new Map<string, string[]>()

  add(x: number, y: number, radius: number, ink: string): void {
    const size = Math.max(0.6, Math.round(radius * 2) / 2)
    const key = `${ink}|${size}`
    let list = this.groups.get(key)
    if (list === undefined) {
      list = []
      this.groups.set(key, list)
    }
    list.push(`M${Math.round(x)} ${Math.round(y)}h0`)
  }

  svg(): string {
    // dimmer inks first, so the bright ones sit on top
    const order = (key: string) => INKS.indexOf(key.split('|')[0] as (typeof INKS)[number])
    return [...this.groups.entries()]
      .sort(([a], [b]) => order(a) - order(b))
      .map(([key, list]) => {
        const [ink, size] = key.split('|')
        return `<path d="${list.join('')}" stroke="${ink}" stroke-width="${Number(size) * 2}"/>`
      })
      .join('')
  }
}

/** The still halftone of the whole picture. */
function halftone(): string {
  const dots = new Dots()
  let row = 0
  for (let y = GRID / 2; y < H + GRID; y += GRID * 0.866, row++) {
    for (let x = (row % 2) * (GRID / 2); x < W + GRID; x += GRID) {
      const b = light(x, y)
      if (b < 0.05) continue
      const r = Math.min(1, b) ** 0.6 * MAX_DOT
      dots.add(x, y, r, inkOf(b))
    }
  }
  return dots.svg()
}

/** A few faint stars, twinkling in three groups. */
function stars(): string {
  const groups = [new Dots(), new Dots(), new Dots()]
  for (let i = 0; i < 90; i++) {
    const x = noise(i, 1, 5) * W
    const y = noise(i, 2, 5) * H
    if (light(x, y) > 0.03 || Math.hypot(x - CX, y - CY) < PHOTON + 40) continue
    groups[i % 3]!.add(x, y, 0.9 + noise(i, 3, 5) * 1.3, i % 5 === 0 ? '#ffe2b0' : '#d8dcff')
  }
  return groups
    .map((g, i) => `<g class="tw" style="animation-delay:-${i * 3}s" stroke-linecap="round">${g.svg()}</g>`)
    .join('')
}

const FRAMES = 16
const FRAME_SECONDS = 1.4

/**
 * Bright clumps riding the disk. Each ring of clumps is evenly spaced, and over all the frames it
 * turns by exactly one spacing, so the last frame leads back into the first with no jump.
 * Inner rings have fewer clumps over a shorter way round, so they turn faster, as in a real disk.
 */
function clumps(): string {
  const frames = Array.from({ length: FRAMES }, () => new Dots())
  for (let ring = 0; ring < 9; ring++) {
    const r = R_IN + 30 + ring * 62
    const count = Math.max(6, Math.round((2 * Math.PI * r) / 150))
    const start = noise(ring, 1, 7) * Math.PI * 2
    for (let k = 0; k < count; k++) {
      for (let f = 0; f < FRAMES; f++) {
        // the disk turns counterclockwise seen from above: the left side comes toward us
        const angle = start + ((k + f / FRAMES) * 2 * Math.PI) / count
        const u = r * Math.cos(angle)
        const v = r * Math.sin(angle)
        const { x, y } = toScreen(u, v)
        if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue
        // hidden behind the shadow on the far side
        if (v < 0 && Math.hypot(x - CX, y - CY) < PHOTON) continue
        const base = diskLight(u, v)
        if (base < 0.12) continue
        const size = Math.min(1, base * 1.4) ** 0.5 * (MAX_DOT + 0.8)
        frames[f]!.add(x, y, size, base > 0.55 ? '#fff3d6' : '#ffc673')
      }
    }
  }
  return frames
    .map((g, f) => `<g class="frame" style="animation-delay:${(f * FRAME_SECONDS).toFixed(1)}s"${f === 0 ? '' : ' opacity="0"'}>${g.svg()}</g>`)
    .join('')
}

export function eventHorizonSvg(): string {
  const cycle = (FRAMES * FRAME_SECONDS).toFixed(1)
  const shown = (100 / FRAMES).toFixed(3)
  const style = `
.tw{animation:tw 16s steps(2) infinite}
@keyframes tw{0%,100%{opacity:1}50%{opacity:.35}}
.frame{opacity:0;animation:frame ${cycle}s steps(1) infinite}
@keyframes frame{0%{opacity:1}${shown}%,100%{opacity:0}}
@media (prefers-reduced-motion: reduce){*{animation:none!important}.frame{opacity:0}}`

  const defs = `<radialGradient id="eh-glow" cx="${CX / W}" cy="${CY / H}" r="0.75"><stop offset="0" stop-color="#3a1408" stop-opacity="0.55"/><stop offset="0.5" stop-color="#1a0810" stop-opacity="0.25"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><style>${style}</style><defs>${defs}</defs>
<rect width="${W}" height="${H}" fill="#030206"/>
<rect width="${W}" height="${H}" fill="url(#eh-glow)"/>
${stars()}
<g fill="none" stroke-linecap="round">${halftone()}</g>
<g fill="none" stroke-linecap="round">${clumps()}</g>
</svg>`
}
