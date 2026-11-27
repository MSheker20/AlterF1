import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Highlight, SeasonSummary } from '../api/types'
import { HomePage } from './HomePage'

const SEASONS: SeasonSummary[] = [
  { year: 1988, champion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna' } },
  { year: 2008, champion: { driverId: 'lewis-hamilton', driverName: 'Lewis Hamilton' } },
]

const HIGHLIGHTS: Highlight[] = [
  {
    season: 1988,
    realSystem: '1961',
    realChampion: { driverId: 'ayrton-senna', driverName: 'Ayrton Senna', points: 90 },
    realChampionConstructorId: 'mclaren',
    alternatives: [
      {
        system: '1991',
        champion: { driverId: 'alain-prost', driverName: 'Alain Prost', points: 105 },
        championConstructorId: 'mclaren',
        realChampionPosition: 2,
        realChampionPoints: 94,
      },
    ],
  },
  {
    season: 2008,
    realSystem: '2003',
    realChampion: { driverId: 'lewis-hamilton', driverName: 'Lewis Hamilton', points: 98 },
    realChampionConstructorId: 'mclaren',
    alternatives: [
      {
        system: '1961',
        champion: { driverId: 'felipe-massa', driverName: 'Felipe Massa', points: 70 },
        championConstructorId: 'ferrari',
        realChampionPosition: 2,
        realChampionPoints: 68,
      },
    ],
  },
]

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status < 300, status, statusText: 'OK', json: async () => body })
}

function stubApi(highlightsStatus = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/api/v1/highlights') {
        return highlightsStatus === 200
          ? jsonResponse(HIGHLIGHTS)
          : jsonResponse({ title: 'Server error' }, highlightsStatus)
      }
      if (url === '/api/v1/seasons') {
        return jsonResponse(SEASONS)
      }
      return jsonResponse({ status: 'UP' })
    }),
  )
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists the seasons whose champion changes, newest first', async () => {
    stubApi()
    renderHome()

    const cards = await screen.findAllByRole('link', { name: /instead of/ })
    expect(cards.map((c) => c.getAttribute('href'))).toEqual([
      '/season/2008?system=1961',
      '/season/1988?system=1991',
    ])
    expect(screen.getByText(/In 2 seasons/)).toBeInTheDocument()
    const prost = screen.getByRole('link', {
      name: '1988 under 1991 rules: Alain Prost instead of Ayrton Senna',
    })
    expect(within(prost).getByText('Senna P2')).toBeInTheDocument()
  })

  it('opens a season from the year picker', async () => {
    stubApi()
    renderHome()

    const select = await screen.findByRole('combobox', { name: 'Season' })
    await screen.findByRole('option', { name: '1988' })
    expect(screen.getByRole('link', { name: '2008 constructors' })).toHaveAttribute(
      'href',
      '/season/2008/constructors',
    )
    await userEvent.selectOptions(select, '1988')

    expect(await screen.findByTestId('location')).toHaveTextContent('/season/1988')
  })

  it('shows a retryable error when highlights fail', async () => {
    stubApi(500)
    renderHome()

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the highlights.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
