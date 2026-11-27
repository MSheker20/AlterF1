import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import i18n from '../i18n'

const SYSTEMS = [
  { id: '1950', firstSeason: 1950, lastSeason: 1960, racePoints: [8, 6, 4, 3, 2] },
  { id: '2010', firstSeason: 2010, lastSeason: null, racePoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] },
]

function renderAt(path: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => (url === '/api/v1/systems' ? SYSTEMS : { status: 'UP' }),
      }),
    ),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/*" element={<App />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AboutPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals()
    await i18n.changeLanguage('en')
  })

  it('explains the systems and credits F1DB', async () => {
    renderAt('/about')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'How AlterF1 works' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('rowheader', { name: /1950/ })).toBeInTheDocument()
    expect(screen.getByText('25-18-15-12-10-8-6-4-2-1')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: "Constructors' championship" }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'F1DB on GitHub' })).toBeInTheDocument()
  })

  it('is in Turkish under /tr, with a switch back to English', async () => {
    renderAt('/tr/about')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'AlterF1 nasıl çalışır' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Takımlar şampiyonası' }),
    ).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('tr')
    expect(screen.getByRole('link', { name: 'Show this page in English' })).toHaveAttribute(
      'href',
      '/about',
    )
    expect(screen.getByRole('link', { name: 'Nasıl çalışır' })).toHaveAttribute('href', '/tr/about')
  })
})
