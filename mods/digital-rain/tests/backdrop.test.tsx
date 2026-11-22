import { test, expect } from 'claude-code/testing'

test('backdrop draws on desktop', async $ => {
  const ui = await $.ui.mount({
    plugin: 'digital-rain',
    surface: 'desktop',
    component: 'Backdrop',
    props: { scene: 'rain', plugin: 'digital-rain', glass: { blur: 18, opacity: 0.55 } },
  })
  const svg = await ui.find({ type: 'Svg' })
  expect(svg).toBeDefined()
  await ui.unmount()
})
