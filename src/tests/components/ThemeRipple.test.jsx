import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import ThemeRipple from '../../components/ThemeRipple'

// Manually drive rAF so we can step through animation frames
let rafQueue = []
const flushRaf = () => {
  const cbs = [...rafQueue]
  rafQueue = []
  cbs.forEach(cb => cb(performance.now()))
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb) => { rafQueue.push(cb); return rafQueue.length })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  // Ensure a valid viewport diagonal
  Object.defineProperty(window, 'innerWidth',  { value: 1280, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800,  configurable: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
  rafQueue = []
})

const origin = { x: 100, y: 100 }

describe('ThemeRipple', () => {
  it('renders a fixed overlay div', () => {
    const holding = { current: true }
    const { container } = render(
      <ThemeRipple origin={origin} theme="dark" holding={holding} onDone={vi.fn()} onRevert={vi.fn()} />
    )
    const overlay = container.querySelector('div[style]')
    expect(overlay).toBeTruthy()
    expect(overlay.style.position).toBe('fixed')
  })

  it('uses old theme background as mask color (dark → light: black)', () => {
    const holding = { current: true }
    const { container } = render(
      <ThemeRipple origin={origin} theme="dark" holding={holding} onDone={vi.fn()} onRevert={vi.fn()} />
    )
    const overlay = container.querySelector('div[style]')
    expect(overlay.style.background).toBe('rgb(0, 0, 0)')
  })

  it('uses old theme background as mask color (light → dark: white)', () => {
    const holding = { current: true }
    const { container } = render(
      <ThemeRipple origin={origin} theme="light" holding={holding} onDone={vi.fn()} onRevert={vi.fn()} />
    )
    const overlay = container.querySelector('div[style]')
    expect(overlay.style.background).toContain('248')
  })

  it('has mask-image applied for circular reveal', () => {
    const holding = { current: true }
    const { container } = render(
      <ThemeRipple origin={origin} theme="dark" holding={holding} onDone={vi.fn()} onRevert={vi.fn()} />
    )
    const overlay = container.querySelector('div[style]')
    const mask = overlay.style.maskImage || overlay.style.webkitMaskImage
    expect(mask).toContain('radial-gradient')
  })

  it('calls onRevert when released early (holding = false, peak radius = 0)', async () => {
    const onRevert = vi.fn()
    const onDone = vi.fn()
    const holding = { current: false }

    render(
      <ThemeRipple origin={origin} theme="dark" holding={holding} onDone={onDone} onRevert={onRevert} />
    )

    // Flush expand tick — holding is false so it transitions to collapse immediately
    await act(async () => { flushRaf() })
    // Collapse with peakRadius=0 calls onRevert immediately
    expect(onRevert).toHaveBeenCalled()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('does not call onDone or onRevert while still expanding', () => {
    const onRevert = vi.fn()
    const onDone = vi.fn()
    const holding = { current: true }

    render(
      <ThemeRipple origin={origin} theme="dark" holding={holding} onDone={onDone} onRevert={onRevert} />
    )

    // One RAF tick — p is tiny, still expanding
    act(() => { flushRaf() })
    expect(onDone).not.toHaveBeenCalled()
    expect(onRevert).not.toHaveBeenCalled()
  })

  it('has pointer-events none so clicks pass through', () => {
    const holding = { current: true }
    const { container } = render(
      <ThemeRipple origin={origin} theme="dark" holding={holding} onDone={vi.fn()} onRevert={vi.fn()} />
    )
    const overlay = container.querySelector('div[style]')
    expect(overlay.style.pointerEvents).toBe('none')
  })
})
