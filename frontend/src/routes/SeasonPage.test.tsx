import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionConfig } from 'motion/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ScoringSystem, SeasonSummary, StandingsResponse } from '../api/types'
import { SeasonPage } from './SeasonPage'

const SEASONS: SeasonSummary[] = [
  { year: 1988, champion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna' } },
  { year: 1991, champion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna' } },
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
    {
      round: 2,
      grandPrixId: 'san-marino',
      code: 'SMR',
      date: '1988-05-01',
      sprint: false,
      skipped: false,
    },
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
    {
      driverId: 'gerhard-berger',
      driverName: 'Gerhard Berger',
      driverCode: 'BER',
      constructorId: 'ferrari',
      constructorName: 'Ferrari',
      excluded: false,
    },
  ],
  champion: { driverId: 'alain-prost', driverName: 'Alain Prost', points: 112.0 },
  realChampion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna', points: 90.0 },
  championChanged: true,
  notes: [],
  standings: [
    {
      position: 1,
      realPosition: 2,
      positionChange: 1,
      driverId: 'alain-prost',
      driverName: 'Alain Prost',
      driverCode: 'PRO',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      points: 112.0,
      realPoints: 87.0,
      wins: 7,
      podiums: 14,
      results: ['1', '2'],
    },
    {
      position: 2,
      realPosition: 1,
      positionChange: -1,
      driverId: 'ayrton-senna',
      driverName: 'Ayrton Senna',
      driverCode: 'SEN',
      constructorId: 'mclaren',
      constructorName: 'McLaren',
      points: 102.0,
      realPoints: 90.0,
      wins: 8,
      podiums: 11,
      results: ['DSQ', '1'],
    },
    {
      position: 3,
      realPosition: 3,
      positionChange: 0,
      driverId: 'gerhard-berger',
      driverName: 'Gerhard Berger',
      driverCode: 'BER',
      constructorId: 'ferrari',
      constructorName: 'Ferrari',
      points: 42.0,
      realPoints: 41.0,
      wins: 1,
      podiums: 5,
      results: ['2', '5'],
    },
  ],
}

const STANDINGS_1988_1961: StandingsResponse = {
  ...STANDINGS_1988_1991,
  system: '1961',
  rules: {
    racePoints: [9, 6, 4, 3, 2, 1],
    sprintPoints: [],
    fastestLap: null,
    bestResults: { type: 'season', count: 11 },
  },
  champion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna', points: 90.0 },
  realChampion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna', points: 90.0 },
  championChanged: false,
  notes: [],
  standings: [
    {
      ...STANDINGS_1988_1991.standings[1],
      position: 1,
      realPosition: 1,
      positionChange: 0,
      points: 90.0,
    },
    {
      ...STANDINGS_1988_1991.standings[0],
      position: 2,
      realPosition: 2,
      positionChange: 0,
      points: 87.0,
    },
    {
      ...STANDINGS_1988_1991.standings[2],
      position: 3,
      realPosition: 3,
      positionChange: 0,
      points: 41.0,
    },
  ],
}

const STANDINGS_2023_WITHOUT_VER: StandingsResponse = {
  season: 2023,
  system: '1991',
  realSystem: '2010',
  preset: 'historical',
  scenario: {
    excludedDrivers: ['max-verstappen'],
    skippedRounds: [],
    sprints: true,
    fastestLap: true,
    preset: 'historical',
    custom: null,
  },
  rules: {
    racePoints: [10, 6, 4, 3, 2, 1],
    sprintPoints: [3, 2, 1],
    fastestLap: null,
    bestResults: { type: 'all' },
  },
  races: [
    {
      round: 1,
      grandPrixId: 'bahrain',
      code: 'BHR',
      date: '2023-03-05',
      sprint: false,
      skipped: false,
    },
  ],
  entrants: [
    {
      driverId: 'max-verstappen',
      driverName: 'Max Verstappen',
      driverCode: 'VER',
      constructorId: 'red-bull',
      constructorName: 'Red Bull',
      excluded: true,
    },
    {
      driverId: 'sergio-perez',
      driverName: 'Sergio Perez',
      driverCode: 'PER',
      constructorId: 'red-bull',
      constructorName: 'Red Bull',
      excluded: false,
    },
  ],
  champion: { driverId: 'sergio-perez', driverName: 'Sergio Perez', points: 118.0 },
  realChampion: { driverId: 'max-verstappen', driverName: 'Max Verstappen', points: 575.0 },
  championChanged: true,
  notes: [],
  standings: [
    {
      position: 1,
      realPosition: 2,
      positionChange: 1,
      driverId: 'sergio-perez',
      driverName: 'Sergio Perez',
      driverCode: 'PER',
      constructorId: 'red-bull',
      constructorName: 'Red Bull',
      points: 118.0,
      realPoints: 285.0,
      wins: 6,
      podiums: 12,
      results: ['1'],
    },
  ],
}

const STANDINGS_2023_FULL: StandingsResponse = {
  ...STANDINGS_2023_WITHOUT_VER,
  scenario: {
    ...STANDINGS_2023_WITHOUT_VER.scenario,
    excludedDrivers: [],
  },
  entrants: STANDINGS_2023_WITHOUT_VER.entrants.map((entrant) => ({
    ...entrant,
    excluded: false,
  })),
  champion: { driverId: 'max-verstappen', driverName: 'Max Verstappen', points: 210.0 },
  championChanged: false,
  notes: [],
  standings: [
    {
      position: 1,
      realPosition: 1,
      positionChange: 0,
      driverId: 'max-verstappen',
      driverName: 'Max Verstappen',
      driverCode: 'VER',
      constructorId: 'red-bull',
      constructorName: 'Red Bull',
      points: 210.0,
      realPoints: 575.0,
      wins: 19,
      podiums: 21,
      results: ['1'],
    },
    ...STANDINGS_2023_WITHOUT_VER.standings.map((row) => ({
      ...row,
      position: 2,
      positionChange: 0,
    })),
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

function renderSeasonPage(initialEntry: string) {
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
                  <SeasonPage />
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

describe('SeasonPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the "Champion changes" headline and refetches when another system is selected', async () => {
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
      if (url === '/api/v1/seasons/1988/standings?system=1961') {
        return jsonResponse(STANDINGS_1988_1961)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({ title: 'Not Found', status: 404, detail: `Unexpected ${url}` }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSeasonPage('/season/1988?system=1991')

    expect(screen.getByRole('heading', { level: 1, name: '1988 season' })).toBeInTheDocument()
    expect(
      await screen.findByText('Champion changes: Prost (112) instead of Senna (90)'),
    ).toBeInTheDocument()
    expect(await screen.findByText('1991 rules · 10-6-4-3-2-1')).toBeInTheDocument()

    const system1961Button = screen.getByRole('button', { name: /^1961/ })
    await user.click(system1961Button)

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/season/1988?system=1961')
    })

    expect(await screen.findByText('Same champion: Senna (90)')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/seasons/1988/standings?system=1961',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('shows the RFC 9457 problem detail on a 404 standings response', async () => {
    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/1949/standings?system=2010') {
        return jsonResponse(
          {
            title: 'Season not found',
            status: 404,
            detail: 'No standings data available for the 1949 season.',
          },
          404,
        )
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSeasonPage('/season/1949')

    expect(
      await screen.findByText('No standings data available for the 1949 season.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Season not found')
  })

  it('sends exclude= in the standings request, renders the Without VER chip, and removes it on click', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/2023/standings?system=1991&exclude=max-verstappen') {
        return jsonResponse(STANDINGS_2023_WITHOUT_VER)
      }
      if (url === '/api/v1/seasons/2023/standings?system=1991') {
        return jsonResponse(STANDINGS_2023_FULL)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({ title: 'Not Found', status: 404, detail: `Unexpected ${url}` }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSeasonPage('/season/2023?exclude=max-verstappen')

    expect(await screen.findByText('With 1 scenario change')).toBeInTheDocument()
    const chip = screen.getByRole('button', { name: /Without VER/i })
    expect(chip).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/seasons/2023/standings?system=1991&exclude=max-verstappen',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )

    await user.click(chip)

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/season/2023?system=1991')
    })
    expect(screen.queryByRole('button', { name: /Without VER/i })).not.toBeInTheDocument()
    expect(await screen.findByText('Same champion: Verstappen (210)')).toBeInTheDocument()
  })

  it('maps 400 problem field errors inline while keeping previous standings, and hides stale standings on 500', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn((input: unknown) => {
      const url = String(input)
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      if (url === '/api/v1/systems') {
        return jsonResponse(SYSTEMS)
      }
      if (url === '/api/v1/seasons/2023/standings?system=1991') {
        return jsonResponse(STANDINGS_2023_FULL)
      }
      if (url === '/api/v1/seasons/2023/standings?system=1991&exclude=max-verstappen') {
        return jsonResponse(
          {
            title: 'Invalid scenario',
            status: 400,
            detail: 'Cannot exclude this driver.',
            field: 'exclude',
          },
          400,
        )
      }
      if (
        url === '/api/v1/seasons/2023/standings?system=1991&preset=pure&exclude=max-verstappen'
      ) {
        return jsonResponse(
          {
            title: 'Invalid scenario',
            status: 400,
            detail: 'General scenario validation failed.',
          },
          400,
        )
      }
      if (
        url === '/api/v1/seasons/2023/standings?system=1991&preset=all&exclude=max-verstappen'
      ) {
        return jsonResponse(
          {
            title: 'Server error',
            status: 500,
            detail: 'Database unavailable.',
          },
          500,
        )
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({ title: 'Not Found', status: 404, detail: `Unexpected ${url}` }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSeasonPage('/season/2023?system=1991')

    expect(await screen.findByText('Same champion: Verstappen (210)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Scenario' }))
    await user.click(screen.getByRole('checkbox', { name: /Max Verstappen/i }))

    expect(await screen.findByText('Cannot exclude this driver.')).toBeInTheDocument()
    // Previous standings stay visible and ChampionHeadline counts data.scenario (0), not URL (1).
    expect(screen.getByText('Same champion: Verstappen (210)')).toBeInTheDocument()
    expect(screen.queryByText('With 1 scenario change')).not.toBeInTheDocument()

    // 400 without field renders in the general alert banner at the top of the panel body.
    await user.click(screen.getByRole('button', { name: 'Pure' }))
    expect(await screen.findByText('General scenario validation failed.')).toBeInTheDocument()
    expect(screen.getByText('Same champion: Verstappen (210)')).toBeInTheDocument()

    // 500 error hides stale standings and shows only the error state.
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(await screen.findByText('Database unavailable.')).toBeInTheDocument()
    expect(screen.queryByText('Same champion: Verstappen (210)')).not.toBeInTheDocument()
  })

  it('closes the scenario panel and resets its local state when the season year changes', async () => {
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
      if (url === '/api/v1/seasons/2023/standings?system=1991') {
        return jsonResponse(STANDINGS_2023_FULL)
      }
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({ title: 'Not Found', status: 404, detail: `Unexpected ${url}` }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSeasonPage('/season/1988?system=1991')
    expect(
      await screen.findByText('Champion changes: Prost (112) instead of Senna (90)'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Scenario' }))
    const filterInput = screen.getByLabelText('Filter drivers')
    await user.type(filterInput, 'Senna')
    expect(filterInput).toHaveValue('Senna')

    await screen.findByRole('option', { name: '2023' })
    await user.selectOptions(screen.getByLabelText('Season'), '2023')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(await screen.findByText('Same champion: Verstappen (210)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Scenario' }))
    expect(screen.getByLabelText('Filter drivers')).toHaveValue('')
  })

  it('renders season view tabs that preserve the URL search string', async () => {
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
      if (url === '/api/v1/health') {
        return jsonResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' })
      }
      return jsonResponse({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderSeasonPage('/season/1988?system=1991')

    expect(
      await screen.findByText('Champion changes: Prost (112) instead of Senna (90)'),
    ).toBeInTheDocument()

    const towerLink = screen.getByRole('link', { name: 'Tower' })
    const compareLink = screen.getByRole('link', { name: 'Compare' })
    const progressionLink = screen.getByRole('link', { name: 'Progression' })

    expect(towerLink).toHaveAttribute('aria-current', 'page')
    expect(compareLink).toHaveAttribute('href', '/season/1988/compare?system=1991')
    expect(progressionLink).toHaveAttribute('href', '/season/1988/progression?system=1991')
  })
})
