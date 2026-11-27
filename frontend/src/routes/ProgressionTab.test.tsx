import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionConfig } from 'motion/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ProgressionResponse,
  ScoringSystem,
  SeasonSummary,
  StandingsResponse,
} from '../api/types'
import { SeasonLayout } from '../components/season/SeasonLayout'
import { ProgressionTab } from './ProgressionTab'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const SEASONS: SeasonSummary[] = [
  { year: 1988, champion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna' } },
]

const SYSTEMS: ScoringSystem[] = [
  { id: '1950', firstSeason: 1950, lastSeason: 1960, racePoints: [8, 6, 4, 3, 2] },
  { id: '1961', firstSeason: 1961, lastSeason: 1990, racePoints: [9, 6, 4, 3, 2, 1] },
  { id: '1991', firstSeason: 1991, lastSeason: 2002, racePoints: [10, 6, 4, 3, 2, 1] },
  { id: '2003', firstSeason: 2003, lastSeason: 2009, racePoints: [10, 8, 6, 5, 4, 3, 2, 1] },
  {
    id: '2010',
    firstSeason: 2010,
    lastSeason: null,
    racePoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  },
]

const STANDINGS_1988_1991: StandingsResponse = {
  season: 1988,
  system: '1991',
  realSystem: '1961',
  preset: 'historical',
  scenario: {
    excludedDrivers: [],
    skippedRounds: [],
    sprints: true,
    fastestLap: true,
    preset: 'historical',
    custom: null,
  },
  rules: {
    racePoints: [10, 6, 4, 3, 2, 1],
    sprintPoints: [],
    fastestLap: null,
    bestResults: { type: 'all' },
  },
  races: [
    { round: 1, grandPrixId: 'brazil', code: 'BRA', date: '1988-04-03', sprint: false, skipped: false },
  ],
  entrants: [
    {
      driverId: 'alain-prost',
      driverName: 'Alain Prost',
      driverCode: 'PRO',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      excluded: false,
    },
    {
      driverId: 'ayrton-senna',
      driverName: 'Ayrton Senna',
      driverCode: 'SEN',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      excluded: false,
    },
  ],
  champion: { driverId: 'alain-prost', driverName: 'Alain Prost', points: 112 },
  realChampion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna', points: 90 },
  championChanged: true,
  notes: [],
  standings: [],
}

const PROGRESSION_CLINCHED: ProgressionResponse = {
  season: 1988,
  system: '1991',
  races: [
    { round: 14, code: 'ESP', sprint: false },
    { round: 15, code: 'JPN', sprint: false },
    { round: 16, code: 'AUS', sprint: false },
  ],
  drivers: [
    {
      driverId: 'alain-prost',
      driverName: 'Alain Prost',
      driverCode: 'PRO',
      constructorId: 'mclaren',
      position: 1,
      points: [96, 102, 112],
    },
    {
      driverId: 'ayrton-senna',
      driverName: 'Ayrton Senna',
      driverCode: 'SEN',
      constructorId: 'mclaren',
      position: 2,
      points: [86, 96, 102],
    },
    {
      driverId: 'gerhard-berger',
      driverName: 'Gerhard Berger',
      driverCode: 'BER',
      constructorId: 'ferrari',
      position: 3,
      points: [38, 42, 42],
    },
  ],
  clinch: { round: 15, code: 'JPN', driverId: 'alain-prost' },
}

const PROGRESSION_FINAL_RACE: ProgressionResponse = {
  ...PROGRESSION_CLINCHED,
  clinch: null,
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  })
}

function renderProgressionTab(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <MotionConfig reducedMotion="always">
          <Routes>
            <Route path="/season/:year" element={<SeasonLayout />}>
              <Route path="progression" element={<ProgressionTab />} />
            </Route>
          </Routes>
        </MotionConfig>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProgressionTab', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 440,
      right: 800,
      width: 800,
      height: 440,
      toJSON: () => ({}),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows the clinch sentence and toggles driver visibility via aria-pressed chips', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/1988/standings?system=1991') {
        return jsonResponse(STANDINGS_1988_1991)
      }
      if (url === '/api/v1/seasons/1988/progression?system=1991') {
        return jsonResponse(PROGRESSION_CLINCHED)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({ title: 'Not Found', status: 404, detail: `Unexpected ${url}` }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderProgressionTab('/season/1988/progression?system=1991')

    expect(
      await screen.findByText('Prost clinched it at round 15 (JPN), with 1 race to go.'),
    ).toBeInTheDocument()

    const prostChip = screen.getByRole('button', { name: /PRO.*Alain Prost/i })
    expect(prostChip).toHaveAttribute('aria-pressed', 'true')

    await user.click(prostChip)
    expect(prostChip).toHaveAttribute('aria-pressed', 'false')

    await user.click(prostChip)
    expect(prostChip).toHaveAttribute('aria-pressed', 'true')

    // Accessible sr-only data table includes the visible drivers' cumulative totals.
    const srTable = screen.getByRole('table', {
      name: 'Cumulative points by race for 1988 (1991 rules)',
    })
    expect(within(srTable).getByText('Alain Prost')).toBeInTheDocument()
    expect(within(srTable).getByText('112')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(prostChip).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Top 5' }))
    expect(prostChip).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the final-race sentence when clinch is null', async () => {
    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/1988/standings?system=1991') {
        return jsonResponse(STANDINGS_1988_1991)
      }
      if (url === '/api/v1/seasons/1988/progression?system=1991') {
        return jsonResponse(PROGRESSION_FINAL_RACE)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderProgressionTab('/season/1988/progression?system=1991')

    expect(await screen.findByText('Decided at the final race.')).toBeInTheDocument()
  })

  it('shows a compact standings error banner with Retry when only standings fails', async () => {
    const user = userEvent.setup()
    let standingsAttempts = 0

    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/1988/standings?system=1991') {
        standingsAttempts += 1
        if (standingsAttempts === 1) {
          return jsonResponse(
            { title: 'Standings unavailable', status: 500, detail: 'Try again shortly.' },
            500,
          )
        }
        return jsonResponse(STANDINGS_1988_1991)
      }
      if (url === '/api/v1/seasons/1988/progression?system=1991') {
        return jsonResponse(PROGRESSION_CLINCHED)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderProgressionTab('/season/1988/progression?system=1991')

    expect(
      await screen.findByText('Prost clinched it at round 15 (JPN), with 1 race to go.'),
    ).toBeInTheDocument()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Standings unavailable')

    await user.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByText('Champion changes: Prost (112) instead of Senna (90)'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('refetches both progression and standings on Retry when both fail', async () => {
    const user = userEvent.setup()
    let standingsCalls = 0
    let progressionCalls = 0

    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/1988/standings?system=1991') {
        standingsCalls += 1
        return jsonResponse({ title: 'Server error', status: 500, detail: 'Standings down.' }, 500)
      }
      if (url === '/api/v1/seasons/1988/progression?system=1991') {
        progressionCalls += 1
        return jsonResponse(
          { title: 'Server error', status: 500, detail: 'Progression down.' },
          500,
        )
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderProgressionTab('/season/1988/progression?system=1991')

    expect(await screen.findByText('Progression down.')).toBeInTheDocument()
    expect(screen.getAllByRole('alert')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => {
      expect(progressionCalls).toBe(2)
      expect(standingsCalls).toBe(2)
    })
  })
})
