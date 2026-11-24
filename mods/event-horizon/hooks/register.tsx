import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { isChosen, writeChoice } from './choice'
import { makeColors } from './make-colors.js'
import { eventHorizonSvg } from './scene'

// ── 色: 漆黒に近い背景に、降着円盤の琥珀色をアクセントに ───────────────
const { theme, problems } = makeColors({
  label: 'Event Horizon',
  only: 'dark',
  roles: {
    accent: '#ff9a3c',
    danger: '#ff5c6a',
    success: '#6fd08c',
    warning: '#f2d04b',
    pro: '#b48cff',
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#060408',
        'surface-1': '#0c080c',
        'surface-2': '#120c10',
        'surface-3': '#171014',
        'text-primary': '#fff1e2',
        'text-secondary': '#e2cdb8',
        'text-muted': '#bba48f',
      },
    },
  },
})

const SCENE = eventHorizonSvg()

const LOOK: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  backdrop: {
    scene: 'event-horizon',
    // the disk is bright behind the words, so the veil is darker here than in the other themes
    glass: { blur: 3, tint: '#050307', opacity: 0.45 },
  },
}

const STYLE: ThemeSetArgs['style'] = {
  UserMessage: {
    backgroundColor: '#24140e',
    borderColor: '#7a3d1c',
    borderWidth: 1,
    radius: 18,
    paddingX: 14,
    paddingY: 10,
    shadow: { x: 0, y: 0, blur: 18, color: '#ff8f3c33' },
  },
  AssistantMessage: {
    backgroundColor: '#0a0709f2',
    radius: 14,
    paddingX: 14,
    paddingY: 10,
  },
  ToolUse: { backgroundColor: '#120c0ff2', radius: 10, paddingX: 8 },
}

async function applyLook($: EngineInterface) {
  try {
    return await $.theme.set({ ...LOOK, style: STYLE })
  } catch (error) {
    $.ui.log(String(error))
    return await $.theme.set(LOOK)
  }
}

const ME = 'event-horizon'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: ME,
      description: 'ブラックホールのテーマ（event-horizon）に切り替える（次のセッションからもこのテーマ）',
    })
    if (await isChosen($, ME)) {
      const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
      if (unpainted !== undefined) {
        $.ui.toast(unpainted)
      }
      await applyLook($)
    }
    return next(e)
  })

  // The desktop app attaches after session.start: set the look again so it draws.
  on('session.attach', async ($, e, next) => {
    const result = await next(e)
    if (await isChosen($, ME)) {
      await applyLook($)
    }
    return result
  })

  // /event-horizon: use this theme now, and in the sessions that start after
  on('command.run', { command: ME }, async $ => {
    const saved = await writeChoice($, ME)
    await applyLook($)
    return {
      text: saved
        ? 'ブラックホールのテーマ（event-horizon）に切り替えました。次のセッションからもこのテーマになります。'
        : 'ブラックホールのテーマ（event-horizon）に切り替えました（選択を保存できなかったので、次のセッションでは元のテーマになることがあります）。',
    }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    if (e.props.scene !== 'event-horizon') {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    return (
      <Svg
        source={SCENE}
        alt="巨大なブラックホール。丸いドットで描かれた降着円盤が黒い影の手前を横切り、曲げられた光が影の上下を弧を描いて囲んでいる"
        isInteractive
      />
    )
  })
}
