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
  races: [
    { round: 1, grandPrixId: 'brazil', code: 'BRA', date: '1988-04-03' },
    { round: 2, grandPrixId: 'san-marino', code: 'SMR', date: '1988-05-01' },
  ],
  champion: { driverId: 'alain-prost', driverName: 'Alain Prost', points: 112.0 },
  realChampion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna', points: 90.0 },
  championChanged: true,
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
  champion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna', points: 90.0 },
  realChampion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna', points: 90.0 },
  championChanged: false,
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
      if (url === '/api/v1/seasons/1988/standings?system=1991&preset=historical') {
        return jsonResponse(STANDINGS_1988_1991)
      }
      if (url === '/api/v1/seasons/1988/standings?system=1961&preset=historical') {
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
      '/api/v1/seasons/1988/standings?system=1961&preset=historical',
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
      if (url === '/api/v1/seasons/1949/standings?system=2010&preset=historical') {
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
})
