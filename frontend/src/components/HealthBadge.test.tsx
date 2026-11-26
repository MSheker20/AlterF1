import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HealthBadge } from './HealthBadge'

function stubFetch(impl: () => Promise<unknown>) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const okResponse = (body: unknown) => Promise.resolve({ ok: true, json: async () => body })

describe('HealthBadge', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows backend status and version when health check succeeds', async () => {
    const fetchMock = stubFetch(() =>
      okResponse({ status: 'UP', service: 'alterf1-backend', version: '0.0.1' }),
    )

    render(<HealthBadge />)

    expect(await screen.findByText('Backend UP · v0.0.1')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health', {
      signal: expect.any(AbortSignal),
    })
  })

  it('shows unreachable message on an HTTP error', async () => {
    stubFetch(() => Promise.resolve({ ok: false, status: 500 }))

    render(<HealthBadge />)

    expect(await screen.findByText('Backend unreachable')).toBeInTheDocument()
  })

  it('shows unreachable message when the network request fails', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')))

    render(<HealthBadge />)

    expect(await screen.findByText('Backend unreachable')).toBeInTheDocument()
  })

  it('does not report UP when the backend answers with another status', async () => {
    stubFetch(() => okResponse({ status: 'DOWN', service: 'alterf1-backend', version: '0.0.1' }))

    render(<HealthBadge />)

    expect(await screen.findByText('Backend unreachable')).toBeInTheDocument()
    expect(screen.queryByText(/Backend UP/)).not.toBeInTheDocument()
  })
})
