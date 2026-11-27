import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionConfig } from 'motion/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  CompareResponse,
  ScoringSystem,
  SeasonSummary,
  StandingsResponse,
} from '../api/types'
import { SeasonLayout } from '../components/season/SeasonLayout'
import { CompareTab } from './CompareTab'

const SEASONS: SeasonSummary[] = [
  { year: 1988, champion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna' } },
  { year: 2023, champion: { driverId: 'max-verstappen', driverName: 'Max Verstappen' } },
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
      driverId: 'ayrton-senna',
      driverName: 'Ayrton Senna',
      driverCode: 'SEN',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      excluded: false,
    },
    {
      driverId: 'alain-prost',
      driverName: 'Alain Prost',
      driverCode: 'PRO',
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

const STANDINGS_1988_1950: StandingsResponse = {
  ...STANDINGS_1988_1991,
  system: '1950',
  rules: {
    racePoints: [8, 6, 4, 3, 2],
    sprintPoints: [],
    fastestLap: { points: 1, maxPosition: null },
    bestResults: { type: 'season', count: 4 },
  },
  champion: { driverId: 'alain-prost', driverName: 'Alain Prost', points: 72 },
}

const COMPARE_1988: CompareResponse = {
  season: 1988,
  realSystem: '1961',
  systems: [
    {
      id: '1950',
      champion: { driverId: 'alain-prost', driverName: 'Alain Prost', points: 72 },
      championChanged: true,
    },
    {
      id: '1961',
      champion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna', points: 90 },
      championChanged: false,
    },
    {
      id: '1991',
      champion: { driverId: 'alain-prost', driverName: 'Alain Prost', points: 112 },
      championChanged: true,
    },
    {
      id: '2003',
      champion: { driverId: 'alain-prost', driverName: 'Alain Prost', points: 120 },
      championChanged: true,
    },
    {
      id: '2010',
      champion: { driverId: 'alain-prost', driverName: 'Alain Prost', points: 299 },
      championChanged: true,
    },
  ],
  drivers: [
    {
      driverId: 'ayrton-senna',
      driverName: 'Ayrton Senna',
      driverCode: 'SEN',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      realPosition: 1,
      cells: {
        '1950': { position: 2, points: 70 },
        '1961': { position: 1, points: 90 },
        '1991': { position: 2, points: 102 },
        '2003': { position: 2, points: 112 },
        '2010': { position: 2, points: 278 },
      },
    },
    {
      driverId: 'alain-prost',
      driverName: 'Alain Prost',
      driverCode: 'PRO',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      realPosition: 2,
      cells: {
        '1950': { position: 1, points: 72 },
        '1961': { position: 2, points: 87 },
        '1991': { position: 1, points: 112 },
        '2003': { position: 1, points: 120 },
        '2010': { position: 1, points: 299 },
      },
    },
    {
      driverId: 'gerhard-berger',
      driverName: 'Gerhard Berger',
      driverCode: 'BER',
      constructorId: 'ferrari',
      constructorName: 'Ferrari',
      realPosition: 3,
      cells: {
        '1961': { position: 3, points: 41 },
        '1991': { position: 3, points: 42 },
        '2003': { position: 3, points: 54 },
        '2010': { position: 3, points: 138 },
      },
    },
  ],
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    json: async () => body,
  })
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>
}

function renderCompareTab(initialEntry: string) {
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
            <Route
              path="/season/:year"
              element={
                <>
                  <SeasonLayout />
                  <LocationProbe />
                </>
              }
            >
              <Route path="compare" element={<CompareTab />} />
            </Route>
          </Routes>
        </MotionConfig>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CompareTab', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders system columns and cells, and clicking a column header writes system= while staying on /compare', async () => {
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
      if (url === '/api/v1/seasons/1988/standings?system=1950') {
        return jsonResponse(STANDINGS_1988_1950)
      }
      if (url === '/api/v1/seasons/1988/compare') {
        return jsonResponse(COMPARE_1988)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({ title: 'Not Found', status: 404, detail: `Unexpected ${url}` }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderCompareTab('/season/1988/compare?system=1991')

    expect(
      await screen.findByText('How each points system ranks the 1988 season'),
    ).toBeInTheDocument()

    const table = screen.getByRole('table', {
      name: 'How each points system ranks the 1988 season',
    })

    // All five historical system headers and key points cells are shown.
    const btn1950 = within(table).getByRole('button', {
      name: 'Show 1950 system (champion: Prost, changed)',
    })
    const btn1961 = within(table).getByRole('button', {
      name: 'Show 1961 system (historical, champion: Senna)',
    })
    const btn1991 = within(table).getByRole('button', {
      name: 'Show 1991 system (champion: Prost, changed)',
    })
    const btn2003 = within(table).getByRole('button', {
      name: 'Show 2003 system (champion: Prost, changed)',
    })
    const btn2010 = within(table).getByRole('button', {
      name: 'Show 2010 system (champion: Prost, changed)',
    })
    expect(btn1950).toBeInTheDocument()
    expect(btn1961).toBeInTheDocument()
    expect(btn1991).toBeInTheDocument()
    expect(btn2003).toBeInTheDocument()
    expect(btn2010).toBeInTheDocument()
    expect(btn1991).toHaveAttribute('aria-current', 'true')
    expect(btn1950).not.toHaveAttribute('aria-current')

    expect(within(table).getByText('Ayrton Senna')).toBeInTheDocument()
    expect(within(table).getByText('Alain Prost')).toBeInTheDocument()
    expect(within(table).getByText('299')).toBeInTheDocument()
    expect(within(table).getByText('Not classified under this system')).toBeInTheDocument()

    // Clicking the 1950 column header writes system=1950 and stays on /compare.
    await user.click(btn1950)

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(
        '/season/1988/compare?system=1950',
      )
    })
  })

  it('sorts drivers when a system sort button is clicked and updates aria-sort', async () => {
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
      if (url === '/api/v1/seasons/1988/compare') {
        return jsonResponse(COMPARE_1988)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderCompareTab('/season/1988/compare?system=1991')

    const table = await screen.findByRole('table', {
      name: 'How each points system ranks the 1988 season',
    })

    // Default sort is by real position: Senna first, Prost second; only Driver column has aria-sort.
    const driverHeader = within(table)
      .getByRole('button', { name: 'Sort by real championship position' })
      .closest('th')
    const sort1991Button = within(table).getByRole('button', {
      name: 'Sort by 1991 position',
    })
    const col1991Header = sort1991Button.closest('th')
    expect(driverHeader).toHaveAttribute('aria-sort', 'ascending')
    expect(col1991Header).not.toHaveAttribute('aria-sort')

    const initialBodyRows = within(table).getAllByRole('row').slice(1)
    expect(initialBodyRows[0]).toHaveTextContent('Ayrton Senna')
    expect(initialBodyRows[1]).toHaveTextContent('Alain Prost')

    await user.click(sort1991Button)

    expect(col1991Header).toHaveAttribute('aria-sort', 'ascending')
    expect(driverHeader).not.toHaveAttribute('aria-sort')

    const sortedBodyRows = within(table).getAllByRole('row').slice(1)
    expect(sortedBodyRows[0]).toHaveTextContent('Alain Prost')
    expect(sortedBodyRows[1]).toHaveTextContent('Ayrton Senna')
  })

  it('shows a compact standings error banner with Retry when only standings fails, and refetches both queries when both fail', async () => {
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
      if (url === '/api/v1/seasons/1988/compare') {
        return jsonResponse(COMPARE_1988)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderCompareTab('/season/1988/compare?system=1991')

    expect(
      await screen.findByText('How each points system ranks the 1988 season'),
    ).toBeInTheDocument()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Standings unavailable')

    await user.click(within(alert).getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByText('Champion changes: Prost (112) instead of Senna (90)'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('refetches both compare and standings on Retry when both fail', async () => {
    const user = userEvent.setup()
    let standingsCalls = 0
    let compareCalls = 0

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
      if (url === '/api/v1/seasons/1988/compare') {
        compareCalls += 1
        return jsonResponse({ title: 'Server error', status: 500, detail: 'Compare down.' }, 500)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderCompareTab('/season/1988/compare?system=1991')

    expect(await screen.findByText('Compare down.')).toBeInTheDocument()
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => {
      expect(compareCalls).toBe(2)
      expect(standingsCalls).toBe(2)
    })
  })

  it('shows compare error state on a 400 when scenario panel is open without previous compare data', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/1988/standings?system=1991&skip=1') {
        return jsonResponse(
          { title: 'Invalid scenario', status: 400, detail: 'At least one race required.', field: 'skip' },
          400,
        )
      }
      if (url === '/api/v1/seasons/1988/compare?skip=1') {
        return jsonResponse(
          { title: 'Invalid scenario', status: 400, detail: 'At least one race required.', field: 'skip' },
          400,
        )
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderCompareTab('/season/1988/compare?system=1991&skip=1')

    expect(await screen.findByText('At least one race required.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Scenario/i }))

    // Without previous compare data to preserve, the tab error state remains visible.
    expect(screen.getAllByText('At least one race required.').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
