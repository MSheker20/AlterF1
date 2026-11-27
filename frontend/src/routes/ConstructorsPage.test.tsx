import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionConfig } from 'motion/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import type {
  ConstructorCompareResponse,
  ConstructorProgressionResponse,
  ConstructorStandingsResponse,
  ScoringSystem,
  SeasonSummary,
  StandingsResponse,
} from '../api/types'
import i18n from '../i18n'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const SEASONS: SeasonSummary[] = [
  { year: 1955, champion: { driverId: 'juan-manuel-fangio', driverName: 'Juan Manuel Fangio' } },
  { year: 1976, champion: { driverId: 'james-hunt', driverName: 'James Hunt' } },
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

const CONSTRUCTORS_1976_1961: ConstructorStandingsResponse = {
  season: 1976,
  system: '1961',
  realSystem: '1961',
  preset: 'historical',
  alternative: false,
  scenario: {
    excludedDrivers: [],
    skippedRounds: [],
    sprints: true,
    fastestLap: true,
    preset: 'historical',
    custom: null,
  },
  rules: {
    racePoints: [9, 6, 4, 3, 2, 1],
    sprintPoints: [],
    fastestLap: null,
    bestResults: { type: 'halves', firstHalfRaces: 8, firstCount: 7, secondCount: 7 },
  },
  constructorRules: {
    bestCarOnly: true,
    bestResults: { type: 'halves', firstHalfRaces: 8, firstCount: 7, secondCount: 7 },
  },
  races: [
    { round: 1, grandPrixId: 'brazil', code: 'BRA', date: '1976-01-25', sprint: false, skipped: false },
    { round: 2, grandPrixId: 'south-africa', code: 'ZAF', date: '1976-03-06', sprint: false, skipped: false },
  ],
  entrants: [
    {
      driverId: 'niki-lauda',
      driverName: 'Niki Lauda',
      driverCode: 'LAU',
      constructorId: 'ferrari',
      constructorName: 'Ferrari',
      excluded: false,
    },
    {
      driverId: 'james-hunt',
      driverName: 'James Hunt',
      driverCode: 'HUN',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      excluded: false,
    },
  ],
  champion: {
    teamId: 'ferrari:ferrari',
    constructorId: 'ferrari',
    engineManufacturerId: 'ferrari',
    teamName: 'Ferrari',
    points: 83,
  },
  realChampion: {
    teamId: 'ferrari:ferrari',
    constructorId: 'ferrari',
    engineManufacturerId: 'ferrari',
    teamName: 'Ferrari',
    points: 83,
  },
  championChanged: false,
  notes: ['ineligible'],
  standings: [
    {
      position: 1,
      realPosition: 1,
      positionChange: 0,
      teamId: 'ferrari:ferrari',
      constructorId: 'ferrari',
      engineManufacturerId: 'ferrari',
      teamName: 'Ferrari',
      points: 83,
      realPoints: 83,
      wins: 6,
      podiums: 13,
      results: ['1', '1'],
    },
    {
      position: 2,
      realPosition: 2,
      positionChange: 0,
      teamId: 'mclaren:ford',
      constructorId: 'mclaren',
      engineManufacturerId: 'ford',
      teamName: 'McLaren-Ford',
      points: 74,
      realPoints: 74,
      wins: 6,
      podiums: 10,
      results: ['DNF', '2'],
    },
  ],
}

const CONSTRUCTORS_1955_1950: ConstructorStandingsResponse = {
  season: 1955,
  system: '1950',
  realSystem: '1950',
  preset: 'historical',
  alternative: true,
  scenario: {
    excludedDrivers: [],
    skippedRounds: [],
    sprints: true,
    fastestLap: true,
    preset: 'historical',
    custom: null,
  },
  rules: {
    racePoints: [8, 6, 4, 3, 2],
    sprintPoints: [],
    fastestLap: { points: 1, maxPosition: null },
    bestResults: { type: 'season', count: 5 },
  },
  constructorRules: {
    bestCarOnly: true,
    bestResults: { type: 'season', count: 5 },
  },
  races: [
    { round: 1, grandPrixId: 'argentina', code: 'ARG', date: '1955-01-16', sprint: false, skipped: false },
  ],
  entrants: [
    {
      driverId: 'juan-manuel-fangio',
      driverName: 'Juan Manuel Fangio',
      driverCode: 'FAN',
      constructorId: 'mercedes',
      constructorName: 'Mercedes',
      excluded: false,
    },
  ],
  champion: {
    teamId: 'mercedes:mercedes',
    constructorId: 'mercedes',
    engineManufacturerId: 'mercedes',
    teamName: 'Mercedes',
    points: 40,
  },
  realChampion: null,
  championChanged: false,
  notes: [],
  standings: [
    {
      position: 1,
      realPosition: null,
      positionChange: null,
      teamId: 'mercedes:mercedes',
      constructorId: 'mercedes',
      engineManufacturerId: 'mercedes',
      teamName: 'Mercedes',
      points: 40,
      realPoints: null,
      wins: 5,
      podiums: 10,
      results: ['1'],
    },
    {
      position: 2,
      realPosition: null,
      positionChange: null,
      teamId: 'ferrari:ferrari',
      constructorId: 'ferrari',
      engineManufacturerId: 'ferrari',
      teamName: 'Ferrari',
      points: 22,
      realPoints: null,
      wins: 1,
      podiums: 5,
      results: ['2'],
    },
  ],
}

const DRIVERS_1976_1961: StandingsResponse = {
  season: 1976,
  system: '1961',
  realSystem: '1961',
  preset: 'historical',
  scenario: CONSTRUCTORS_1976_1961.scenario,
  rules: CONSTRUCTORS_1976_1961.rules,
  races: CONSTRUCTORS_1976_1961.races,
  entrants: CONSTRUCTORS_1976_1961.entrants,
  champion: { driverId: 'james-hunt', driverName: 'James Hunt', points: 69 },
  realChampion: { driverId: 'james-hunt', driverName: 'James Hunt', points: 69 },
  championChanged: false,
  notes: [],
  standings: [
    {
      position: 1,
      realPosition: 1,
      positionChange: 0,
      driverId: 'james-hunt',
      driverName: 'James Hunt',
      driverCode: 'HUN',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      points: 69,
      realPoints: 69,
      wins: 6,
      podiums: 8,
      results: ['DNF', '2'],
    },
  ],
}

const COMPARE_CONSTRUCTORS_1976: ConstructorCompareResponse = {
  season: 1976,
  realSystem: '1961',
  alternative: false,
  systems: [
    {
      id: '1961',
      champion: CONSTRUCTORS_1976_1961.champion,
      championChanged: false,
    },
    {
      id: '2010',
      champion: {
        teamId: 'mclaren:ford',
        constructorId: 'mclaren',
        engineManufacturerId: 'ford',
        teamName: 'McLaren-Ford',
        points: 250,
      },
      championChanged: true,
    },
  ],
  teams: [
    {
      teamId: 'ferrari:ferrari',
      constructorId: 'ferrari',
      engineManufacturerId: 'ferrari',
      teamName: 'Ferrari',
      realPosition: 1,
      cells: {
        '1961': { position: 1, points: 83 },
        '2010': { position: 2, points: 240 },
      },
    },
    {
      teamId: 'mclaren:ford',
      constructorId: 'mclaren',
      engineManufacturerId: 'ford',
      teamName: 'McLaren-Ford',
      realPosition: 2,
      cells: {
        '1961': { position: 2, points: 74 },
        '2010': { position: 1, points: 250 },
      },
    },
  ],
}

const PROGRESSION_CONSTRUCTORS_1976: ConstructorProgressionResponse = {
  season: 1976,
  system: '1961',
  alternative: false,
  races: [
    { round: 1, code: 'BRA', sprint: false },
    { round: 2, code: 'ZAF', sprint: false },
  ],
  teams: [
    {
      teamId: 'ferrari:ferrari',
      constructorId: 'ferrari',
      engineManufacturerId: 'ferrari',
      teamName: 'Ferrari',
      position: 1,
      points: [9, 18],
    },
    {
      teamId: 'mclaren:ford',
      constructorId: 'mclaren',
      engineManufacturerId: 'ford',
      teamName: 'McLaren-Ford',
      position: 2,
      points: [0, 6],
    },
  ],
  clinch: { round: 1, code: 'BRA', teamId: 'ferrari:ferrari' },
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

function renderApp(initialEntry: string) {
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
              path="/*"
              element={
                <>
                  <App />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </MotionConfig>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ConstructorsPage', () => {
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

  afterEach(async () => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    await i18n.changeLanguage('en')
  })

  it('renders constructors standings, best-car-only note, and preserves query string when switching to Drivers', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/1976/constructors?system=1961&preset=pure') {
        return jsonResponse(CONSTRUCTORS_1976_1961)
      }
      if (url === '/api/v1/seasons/1976/standings?system=1961&preset=pure') {
        return jsonResponse(DRIVERS_1976_1961)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({ title: 'Not Found', status: 404, detail: `Unexpected ${url}` }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderApp('/season/1976/constructors?system=1961&preset=pure')

    expect(
      await screen.findByRole('heading', { level: 1, name: '1976 constructors' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Same champion: Ferrari (83)')).toBeInTheDocument()

    // Best-car-only rule appears in the rules line and inside the "i" info area.
    expect(screen.getByText(/Only each team's best-placed car scores/)).toBeInTheDocument()
    const infoButton = screen.getByRole('button', { name: /About these points/ })
    await user.click(infoButton)
    expect(infoButton).toHaveAttribute('aria-expanded', 'true')
    const notesList = screen.getByRole('list', { name: '' })
    expect(within(notesList).getByText("Only each team's best-placed car scores")).toBeInTheDocument()
    expect(within(notesList).getByText(/Some teams or entries could not score/)).toBeInTheDocument()

    // Tower renders team names without 3-letter driver codes.
    const tower = screen.getByRole('list', { name: 'Constructor standings' })
    const rows = within(tower).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Ferrari')).toBeInTheDocument()
    expect(within(rows[1]).getByText('McLaren-Ford')).toBeInTheDocument()
    expect(within(rows[0]).queryByText('LAU')).not.toBeInTheDocument()

    // Championship switch marks Constructors active and preserves query params when switching.
    const champNav = screen.getByRole('navigation', { name: 'Championship' })
    const driversLink = within(champNav).getByRole('link', { name: 'Drivers' })
    const constructorsLink = within(champNav).getByRole('link', { name: 'Constructors' })
    expect(constructorsLink).toHaveAttribute('aria-current', 'page')
    expect(driversLink).toHaveAttribute('href', '/season/1976?system=1961&preset=pure')

    await user.click(driversLink)
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(
        '/season/1976?system=1961&preset=pure',
      )
    })
    expect(await screen.findByText('Same champion: Hunt (69)')).toBeInTheDocument()
  })

  it('shows the pre-1958 alternative badge and hides real-position deltas (EN and TR)', async () => {
    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/1955/constructors?system=1950') {
        return jsonResponse(CONSTRUCTORS_1955_1950)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { unmount } = renderApp('/season/1955/constructors?system=1950')

    expect(
      await screen.findByText("Alternative — the constructors' championship began in 1958"),
    ).toBeInTheDocument()
    expect(screen.getByText('Alternative champion: Mercedes (40)')).toBeInTheDocument()
    // Real-position delta column and slope comparison are hidden for pre-1958 seasons.
    expect(screen.queryByText('position unchanged')).not.toBeInTheDocument()
    expect(screen.queryByText('Δ')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Real versus selected system comparison' }),
    ).not.toBeInTheDocument()

    unmount()

    renderApp('/tr/season/1955/constructors?system=1950')
    expect(
      await screen.findByText("Alternatif — takımlar şampiyonası 1958'de başladı"),
    ).toBeInTheDocument()
    expect(screen.getByText('Her yarışta takımın sadece en iyi aracı puan alır', { exact: false })).toBeInTheDocument()
  })

  it('fetches constructors compare and progression endpoints on the corresponding tabs', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/1976/constructors?system=1961') {
        return jsonResponse(CONSTRUCTORS_1976_1961)
      }
      if (url === '/api/v1/seasons/1976/constructors/compare') {
        return jsonResponse(COMPARE_CONSTRUCTORS_1976)
      }
      if (url === '/api/v1/seasons/1976/constructors/progression?system=1961') {
        return jsonResponse(PROGRESSION_CONSTRUCTORS_1976)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({ title: 'Not Found', status: 404, detail: `Unexpected ${url}` }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderApp('/season/1976/constructors/compare?system=1961')

    const table = await screen.findByRole('table', {
      name: 'How each points system ranks the 1976 constructors',
    })
    expect(within(table).getByRole('rowheader', { name: /Ferrari/ })).toBeInTheDocument()
    expect(within(table).getByRole('rowheader', { name: /McLaren-Ford/ })).toBeInTheDocument()
    expect(
      within(table).getByRole('button', { name: 'Show 2010 system (champion: McLaren-Ford, changed)' }),
    ).toBeInTheDocument()

    const tabsNav = screen.getByRole('navigation', { name: 'Season views' })
    await user.click(within(tabsNav).getByRole('link', { name: 'Progression' }))

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(
        '/season/1976/constructors/progression?system=1961',
      )
    })
    expect(
      await screen.findByText('Ferrari clinched it at round 1 (BRA), with 1 race to go.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /McLaren-Ford/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
