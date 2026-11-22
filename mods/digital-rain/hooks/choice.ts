import type { EngineInterface } from 'claude-code'

// The themes of this collection share one small file that says which of them is in use,
// so that with several installed, only the chosen one sets the look when a session starts.

const THEMES = ['galaxy-night', 'digital-rain']

async function choicePath($: EngineInterface): Promise<string | undefined> {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME'))
  return home === undefined ? undefined : `${home}/.claude/claude-desktop-themes.json`
}

/** The theme chosen last, or undefined when none has been chosen yet. */
export async function readChoice($: EngineInterface): Promise<string | undefined> {
  try {
    const path = await choicePath($)
    if (path === undefined || !(await $.fs.exists(path))) return undefined
    const theme: unknown = JSON.parse(await $.fs.read(path)).theme
    return typeof theme === 'string' ? theme : undefined
  } catch {
    return undefined
  }
}

export async function writeChoice($: EngineInterface, theme: string): Promise<boolean> {
  const path = await choicePath($)
  if (path === undefined) return false
  await $.fs.write(path, JSON.stringify({ theme }, null, 2) + '\n')
  return true
}

/** Whether this theme should set the look: it was chosen, or nothing this collection knows was. */
export async function isChosen($: EngineInterface, me: string): Promise<boolean> {
  const choice = await readChoice($)
  return choice === undefined || choice === me || !THEMES.includes(choice)
}
