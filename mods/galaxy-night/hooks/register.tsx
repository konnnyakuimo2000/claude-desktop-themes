import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { blockSpaceSvg } from './scene'

// ── 色: 深い藍の宇宙に、すみれ色のアクセント ─────────────────────────
const { theme, problems } = makeColors({
  label: 'Galaxy Night',
  only: 'dark',
  codeTheme: { dark: 'tokyo-night' },
  roles: {
    accent: '#8b7bff',
    danger: '#ff6b8a',
    success: '#5fd4a8',
    warning: '#f2b84b',
    pro: '#c78bff',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0a0c1e',
        'surface-1': '#10132a',
        'surface-2': '#161a35',
        'surface-3': '#1b1f3d',
        'text-primary': '#eceaff',
        'text-secondary': '#c6c4ea',
        'text-muted': '#a09ecb',
      },
    },
  },
})

// ── 背景: 立体ブロックで描いた宇宙（scene.ts）─────────────────────────
const SCENE = blockSpaceSvg()

const LOOK: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  backdrop: {
    scene: 'galaxy',
    glass: { blur: 4, tint: '#0a0c1e', opacity: 0.22 },
  },
}

const STYLE: ThemeSetArgs['style'] = {
  UserMessage: {
    backgroundColor: '#22285a',
    borderColor: '#4a4f9a',
    borderWidth: 1,
    radius: [18, 18, 4, 18],
    paddingX: 14,
    paddingY: 10,
    shadow: { x: 0, y: 0, blur: 16, color: '#8b7bff33' },
  },
  AssistantMessage: {
    backgroundColor: '#10132af0',
    radius: 14,
    paddingX: 14,
    paddingY: 10,
  },
  ToolUse: { backgroundColor: '#161a35f0', radius: 10, paddingX: 8 },
}

async function applyLook($: EngineInterface) {
  try {
    return await $.theme.set({ ...LOOK, style: STYLE })
  } catch (error) {
    $.ui.log(String(error))
    return await $.theme.set(LOOK)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await applyLook($)
    return next(e)
  })

  // The desktop app attaches after session.start: set the look again so it draws.
  on('session.attach', async ($, e, next) => {
    const result = await next(e)
    await applyLook($)
    return result
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    if (e.props.scene !== 'galaxy') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return (
      <Svg
        source={SCENE}
        alt="細かなブロックで描いた宇宙。左上に太陽、右上にブラックホール、右に地球と月、右下に輪のある惑星、左下に渦巻き銀河、左に星雲、ときどき彗星が横切る"
        isInteractive
      />
    )
  })
}
