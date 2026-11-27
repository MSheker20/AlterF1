import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import { SeasonNotes } from './SeasonNotes'

describe('SeasonNotes', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

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

  it('supports the constructors best-car-only note', async () => {
    render(
      <MemoryRouter>
        <SeasonNotes notes={['best-car-only']} mode="constructors" />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: /About these points/ }))
    expect(screen.getByText("Only each team's best-placed car scores")).toBeInTheDocument()
  })

  it('uses constructors wording for team-affected notes in EN and TR while keeping drivers wording unchanged', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <SeasonNotes notes={['best-scaled', 'ineligible', 'shared-points']} mode="drivers" />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: /About these points/ }))
    expect(screen.getByText(/only a driver's best results/)).toBeInTheDocument()
    expect(screen.getByText(/Some finishers could not score/)).toBeInTheDocument()
    expect(screen.getByText(/Drivers who shared a car/)).toBeInTheDocument()
    unmount()

    const { unmount: unmountEnConstructors } = render(
      <MemoryRouter>
        <SeasonNotes
          notes={['best-scaled', 'ineligible', 'shared-points', 'half-points']}
          mode="constructors"
        />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: /About these points/ }))
    expect(screen.getByText(/only each team's best results/)).toBeInTheDocument()
    expect(screen.getByText(/Some teams or entries could not score/)).toBeInTheDocument()
    expect(screen.getByText(/some team totals have long decimals/)).toBeInTheDocument()
    expect(screen.getByText(/paid half points/)).toBeInTheDocument()
    unmountEnConstructors()

    await i18n.changeLanguage('tr')
    render(
      <MemoryRouter>
        <SeasonNotes notes={['best-scaled', 'ineligible', 'shared-points']} mode="constructors" />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: /Bu puanlar hakkında/ }))
    expect(screen.getByText(/her takımın sadece en iyi sonuçlarını/)).toBeInTheDocument()
    expect(screen.getByText(/Bazı takımlar ya da araçlar bu sezon şampiyonadan ihraç edildi/)).toBeInTheDocument()
    expect(screen.getByText(/bazı takım toplamları uzun ondalıklı/)).toBeInTheDocument()
  })
})
