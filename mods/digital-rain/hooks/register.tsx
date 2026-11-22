import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { rainSvg } from './scene'

// ── 色: 黒に近い深緑の画面に、蛍光グリーンのアクセント ─────────────────
const { theme, problems } = makeColors({
  label: 'Digital Rain',
  only: 'dark',
  roles: {
    accent: '#22e07a',
    danger: '#ff5470',
    success: '#9be15d',
    warning: '#e8c547',
    pro: '#4fd1c5',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#040906',
        'surface-1': '#08110b',
        'surface-2': '#0c1810',
        'surface-3': '#101e14',
        'text-primary': '#dcffe4',
        'text-secondary': '#aee0b9',
        'text-muted': '#86b893',
      },
    },
  },
})

const SCENE = rainSvg()

const LOOK: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  backdrop: {
    scene: 'rain',
    // a darker veil than the space theme: the rain runs under the words
    glass: { blur: 2, tint: '#020a05', opacity: 0.38 },
  },
}

const STYLE: ThemeSetArgs['style'] = {
  UserMessage: {
    backgroundColor: '#0d2416',
    borderColor: '#1f6b3a',
    borderWidth: 1,
    radius: [4, 4, 0, 4],
    paddingX: 14,
    paddingY: 10,
    shadow: { x: 0, y: 0, blur: 14, color: '#22e07a33' },
  },
  AssistantMessage: {
    backgroundColor: '#060d08f2',
    radius: 4,
    paddingX: 14,
    paddingY: 10,
  },
  ToolUse: { backgroundColor: '#0a160df2', radius: 4, paddingX: 8 },
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
    if (e.props.scene !== 'rain') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return <Svg source={SCENE} alt="黒い画面を、緑色の文字の列が上から雨のように降り続けている" isInteractive />
  })
}
