import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { SeasonNotes } from './SeasonNotes'

describe('SeasonNotes', () => {
  it('renders nothing when the season has no notes', () => {
    const { container } = render(
      <MemoryRouter>
        <SeasonNotes notes={[]} />
      </MemoryRouter>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows only the notes that apply, with a link to the explanation', async () => {
    render(
      <MemoryRouter>
        <SeasonNotes notes={['half-points', 'sprint-assumed']} />
      </MemoryRouter>,
    )
    const toggle = screen.getByRole('button', { name: /About these points/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText(/paid half points/)).toBeInTheDocument()
    expect(screen.getByText(/scores them 3-2-1/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'How the scoring was modelled' })).toHaveAttribute(
      'href',
      '/about',
    )
  })
})
