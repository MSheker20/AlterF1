import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionConfig } from 'motion/react'
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EntrantSummary, RaceSummary, RulesSummary } from '../../api/types'
import {
  createDefaultScenario,
  defaultSystemForYear,
  parseScenario,
  scenarioToParams,
} from '../../lib/scenario'
import { ScenarioPanel } from './ScenarioPanel'
import type { ScenarioInlineErrors } from './ScenarioPanel'

const ENTRANTS: EntrantSummary[] = [
  {
    driverId: 'max-verstappen',
    driverName: 'Max Verstappen',
    driverCode: 'VER',
    constructorId: 'red-bull',
    constructorName: 'Red Bull',
    excluded: false,
  },
  {
    driverId: 'sergio-perez',
    driverName: 'Sergio Perez',
    driverCode: 'PER',
    constructorId: 'red-bull',
    constructorName: 'Red Bull',
    excluded: false,
  },
]

const RACES: RaceSummary[] = [
  { round: 1, grandPrixId: 'bahrain', code: 'BHR', date: '2023-03-05', sprint: false, skipped: false },
  { round: 4, grandPrixId: 'azerbaijan', code: 'AZE', date: '2023-04-30', sprint: true, skipped: false },
  { round: 5, grandPrixId: 'miami', code: 'MIA', date: '2023-05-07', sprint: false, skipped: false },
]

const RULES_2010: RulesSummary = {
  racePoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  sprintPoints: [8, 7, 6, 5, 4, 3, 2, 1],
  fastestLap: { points: 1, maxPosition: 10 },
  bestResults: { type: 'all' },
}

interface PanelHarnessProps {
  open?: boolean
  isDesktop?: boolean
  season?: number
  rules?: RulesSummary | null
  inlineErrors?: ScenarioInlineErrors
  restoreFocusRef?: RefObject<HTMLButtonElement | null>
  onClose?: () => void
}

function PanelHarness({
  open = true,
  isDesktop = true,
  season = 2023,
  rules = RULES_2010,
  inlineErrors,
  restoreFocusRef,
  onClose = vi.fn(),
}: PanelHarnessProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const scenario = parseScenario(searchParams, defaultSystemForYear(season))

  return (
    <>
      <ScenarioPanel
        open={open}
        isDesktop={isDesktop}
        season={season}
        scenario={scenario}
        entrants={ENTRANTS}
        races={RACES}
        rules={rules}
        inlineErrors={inlineErrors}
        restoreFocusRef={restoreFocusRef}
        onChangeScenario={(updater) => {
          setSearchParams(
            (prevParams) => {
              const prevScenario = parseScenario(prevParams, defaultSystemForYear(season))
              return scenarioToParams(updater(prevScenario))
            },
            { replace: true },
          )
        }}
        onReset={() => {
          setSearchParams(scenarioToParams(createDefaultScenario(defaultSystemForYear(season))), {
            replace: true,
          })
        }}
        onClose={onClose}
      />
      <div data-testid="search-probe">{location.search}</div>
    </>
  )
}

function renderPanel(initialEntry = '/season/2023?system=2010', props: PanelHarnessProps = {}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MotionConfig reducedMotion="always">
        <Routes>
          <Route path="/season/:year" element={<PanelHarness {...props} />} />
        </Routes>
      </MotionConfig>
    </MemoryRouter>,
  )
}

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

describe('ScenarioPanel', () => {
  afterEach(() => {
    vi.useRealTimers()
    if (originalClipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor)
    } else {
      Reflect.deleteProperty(navigator, 'clipboard')
    }
  })

  it('writes exclude= to the URL when excluding a driver', async () => {
    const user = userEvent.setup()
    renderPanel()

    const verCheckbox = screen.getByRole('checkbox', { name: /Max Verstappen/i })
    await user.click(verCheckbox)

    const params = new URLSearchParams(screen.getByTestId('search-probe').textContent ?? '')
    expect(params.get('exclude')).toBe('max-verstappen')
    expect(screen.getByText('1 removed')).toBeInTheDocument()
  })

  it('writes skip= to the URL when toggling a race and prevents skipping all races', async () => {
    const user = userEvent.setup()
    renderPanel()

    const miamiButton = screen.getByRole('button', { name: /Round 5 MIA/i })
    await user.click(miamiButton)

    const params = new URLSearchParams(screen.getByTestId('search-probe').textContent ?? '')
    expect(params.get('skip')).toBe('5')
    expect(miamiButton).toHaveAttribute('aria-pressed', 'true')

    const bakuButton = screen.getByRole('button', { name: /Round 4 AZE/i })
    await user.click(bakuButton)

    const bahrainButton = screen.getByRole('button', { name: /Round 1 BHR/i })
    expect(bahrainButton).toBeDisabled()
  })

  it('writes preset= to the URL when changing real-life multipliers', async () => {
    const user = userEvent.setup()
    renderPanel()

    const pureButton = screen.getByRole('button', { name: 'Pure' })
    await user.click(pureButton)

    const params = new URLSearchParams(screen.getByTestId('search-probe').textContent ?? '')
    expect(params.get('preset')).toBe('pure')
    expect(
      screen.getByText('No multipliers: every race scores in full'),
    ).toBeInTheDocument()
  })

  it('validates custom points and writes custom= after debounce', () => {
    vi.useFakeTimers()
    renderPanel('/season/2023?system=custom&custom=25,18,15')

    const pointsInput = screen.getByLabelText('Race points (comma-separated)')
    expect(pointsInput).toHaveValue('25,18,15')

    fireEvent.change(pointsInput, { target: { value: '25,abc' } })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    const invalidParams = new URLSearchParams(screen.getByTestId('search-probe').textContent ?? '')
    expect(invalidParams.get('custom')).toBe('25,18,15')

    fireEvent.change(pointsInput, { target: { value: '10,6,4,3,2,1' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(399)
    })
    const beforeDebounce = new URLSearchParams(
      screen.getByTestId('search-probe').textContent ?? '',
    )
    expect(beforeDebounce.get('custom')).toBe('25,18,15')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    const afterDebounce = new URLSearchParams(screen.getByTestId('search-probe').textContent ?? '')
    expect(afterDebounce.get('custom')).toBe('10,6,4,3,2,1')
  })

  it('keeps both custom= and exclude= when a driver is removed within the 400ms points debounce', () => {
    vi.useFakeTimers()
    renderPanel('/season/2023?system=custom&custom=25,18,15')

    const pointsInput = screen.getByLabelText('Race points (comma-separated)')
    fireEvent.change(pointsInput, { target: { value: '10,6,4' } })

    act(() => {
      vi.advanceTimersByTime(150)
    })

    const verCheckbox = screen.getByRole('checkbox', { name: /Max Verstappen/i })
    fireEvent.click(verCheckbox)

    const beforeTimer = new URLSearchParams(screen.getByTestId('search-probe').textContent ?? '')
    expect(beforeTimer.get('exclude')).toBe('max-verstappen')
    expect(beforeTimer.get('custom')).toBe('25,18,15')

    act(() => {
      vi.advanceTimersByTime(400)
    })

    const afterTimer = new URLSearchParams(screen.getByTestId('search-probe').textContent ?? '')
    expect(afterTimer.get('custom')).toBe('10,6,4')
    expect(afterTimer.get('exclude')).toBe('max-verstappen')
  })

  it('cancels pending custom points debounce on Create from current rules and on Reset', () => {
    vi.useFakeTimers()
    renderPanel('/season/2023?system=custom&custom=25,18,15')

    const pointsInput = screen.getByLabelText('Race points (comma-separated)')
    fireEvent.change(pointsInput, { target: { value: '10,6,4' } })

    fireEvent.click(screen.getByRole('button', { name: 'Create custom system from current rules' }))
    act(() => {
      vi.advanceTimersByTime(500)
    })

    const afterCreate = new URLSearchParams(screen.getByTestId('search-probe').textContent ?? '')
    expect(afterCreate.get('custom')).toBe('25,18,15,12,10,8,6,4,2,1')

    fireEvent.change(pointsInput, { target: { value: '8,6,4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    act(() => {
      vi.advanceTimersByTime(500)
    })

    const afterReset = new URLSearchParams(screen.getByTestId('search-probe').textContent ?? '')
    expect(afterReset.get('system')).toBe('1991')
    expect(afterReset.has('custom')).toBe(false)
  })

  it('uses text inputMode on custom points, resets invalid drafts on Create from current rules, and puts legend first in fieldsets', () => {
    renderPanel('/season/2023?system=custom&custom=25,18,15,12,10,8,6,4,2,1')

    const pointsInput = screen.getByLabelText('Race points (comma-separated)')
    expect(pointsInput).toHaveAttribute('inputmode', 'text')
    expect(pointsInput).toHaveAttribute('autocomplete', 'off')
    expect(pointsInput).toHaveAttribute('spellcheck', 'false')

    fireEvent.change(pointsInput, { target: { value: '25,abc' } })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create custom system from current rules' }))
    expect(pointsInput).toHaveValue('25,18,15,12,10,8,6,4,2,1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    const driversLegend = screen.getByText('Remove drivers').closest('legend')
    expect(driversLegend?.parentElement?.tagName).toBe('FIELDSET')
    expect(driversLegend?.parentElement?.firstElementChild).toBe(driversLegend)

    const racesLegend = screen.getByText('Remove races').closest('legend')
    expect(racesLegend?.parentElement?.tagName).toBe('FIELDSET')
    expect(racesLegend?.parentElement?.firstElementChild).toBe(racesLegend)
  })

  it('disables the fastest-lap bonus switch for custom systems when rules.fastestLap is null', () => {
    renderPanel('/season/2023?system=custom&custom=25,18,15', {
      rules: { ...RULES_2010, fastestLap: null },
    })

    const flSwitch = screen.getByRole('switch', { name: 'Fastest-lap bonus' })
    expect(flSwitch).toBeDisabled()
    expect(flSwitch).toHaveAttribute('aria-checked', 'false')
    expect(
      screen.getByText('Turn on the fastest-lap point in the custom system below'),
    ).toBeInTheDocument()

    fireEvent.click(flSwitch)
    const params = new URLSearchParams(screen.getByTestId('search-probe').textContent ?? '')
    expect(params.has('fl')).toBe(false)
  })

  it('announces copy success and shows a read-only URL fallback when clipboard fails', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    renderPanel()

    const copyButton = screen.getByRole('button', { name: 'Copy link' })
    await user.click(copyButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
    })
    expect(writeText).toHaveBeenCalledWith(window.location.href)

    await user.click(screen.getByRole('button', { name: 'Copied' }))

    expect(await screen.findByText('Could not copy — select the link')).toBeInTheDocument()
    const fallbackInput = screen.getByLabelText('Could not copy — select the link')
    expect(fallbackInput).toHaveAttribute('readonly')
    expect(fallbackInput).toHaveValue(window.location.href)
  })

  it('restores focus to the previously active element on close, or falls back to restoreFocusRef', async () => {
    const user = userEvent.setup()

    function FocusHarness() {
      const [open, setOpen] = useState(false)
      const [showTrigger, setShowTrigger] = useState(true)
      const scenarioBtnRef = useRef<HTMLButtonElement | null>(null)

      return (
        <MemoryRouter initialEntries={['/season/2023?system=2010']}>
          <MotionConfig reducedMotion="always">
            <Routes>
              <Route
                path="/season/:year"
                element={
                  <>
                    <button ref={scenarioBtnRef} type="button" onClick={() => setOpen(true)}>
                      Scenario Trigger
                    </button>
                    {showTrigger && (
                      <button type="button" onClick={() => setOpen(true)}>
                        Custom Trigger
                      </button>
                    )}
                    <button type="button" onClick={() => setShowTrigger(false)}>
                      Remove Custom Trigger
                    </button>
                    <PanelHarness
                      open={open}
                      restoreFocusRef={scenarioBtnRef}
                      onClose={() => setOpen(false)}
                    />
                  </>
                }
              />
            </Routes>
          </MotionConfig>
        </MemoryRouter>
      )
    }

    render(<FocusHarness />)

    const customTrigger = screen.getByRole('button', { name: 'Custom Trigger' })
    await user.click(customTrigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close scenario panel' }))
    expect(customTrigger).toHaveFocus()

    await user.click(customTrigger)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Custom Trigger' }))
    await user.click(screen.getByRole('button', { name: 'Close scenario panel' }))
    expect(screen.getByRole('button', { name: 'Scenario Trigger' })).toHaveFocus()
  })
})
