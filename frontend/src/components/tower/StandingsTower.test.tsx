import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotionConfig } from 'motion/react'
import { describe, expect, it, vi } from 'vitest'
import type { RaceSummary, StandingRow } from '../../api/types'
import { StandingsTower } from './StandingsTower'

const RACES: RaceSummary[] = [
  { round: 1, grandPrixId: 'brazil', code: 'BRA', date: '1988-04-03' },
  { round: 2, grandPrixId: 'san-marino', code: 'SMR', date: '1988-05-01' },
]

function makeRow(position: number, overrides: Partial<StandingRow> = {}): StandingRow {
  return {
    position,
    realPosition: position,
    positionChange: 0,
    driverId: `driver-${position}`,
    driverName: `Driver ${position}`,
    driverCode: `D${String(position).padStart(2, '0')}`,
    constructorId: 'mclaren',
    constructorName: 'McLaren',
    points: Math.max(0, 100 - position * 3),
    realPoints: Math.max(0, 100 - position * 3),
    wins: position === 1 ? 5 : 0,
    podiums: position <= 3 ? 6 : 0,
    results: ['1', '2'],
    ...overrides,
  }
}

describe('StandingsTower', () => {
  it('renders rows in standings order with points and delta labels', () => {
    const standings: StandingRow[] = [
      makeRow(1, {
        driverId: 'alain-prost',
        driverName: 'Alain Prost',
        driverCode: 'PRO',
        constructorId: 'mclaren',
        constructorName: 'McLaren',
        points: 112,
        realPosition: 2,
        positionChange: 1,
      }),
      makeRow(2, {
        driverId: 'ayrton-senna',
        driverName: 'Ayrton Senna',
        driverCode: 'SEN',
        constructorId: 'mclaren',
        constructorName: 'McLaren',
        points: 102.5,
        realPosition: 1,
        positionChange: -1,
      }),
      makeRow(3, {
        driverId: 'gerhard-berger',
        driverName: 'Gerhard Berger',
        driverCode: 'BER',
        constructorId: 'ferrari',
        constructorName: 'Ferrari',
        points: 42,
        realPosition: 3,
        positionChange: 0,
      }),
    ]

    render(
      <MotionConfig reducedMotion="always">
        <StandingsTower
          standings={standings}
          races={RACES}
          season={1988}
          systemId="1991"
          isDesktop={false}
          expandedDriverId={null}
          selectedDriverId={null}
          onSelectRow={vi.fn()}
        />
      </MotionConfig>,
    )

    const list = screen.getByRole('list', { name: 'Driver standings' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)

    expect(within(items[0]).getByText('PRO')).toBeInTheDocument()
    expect(within(items[0]).getByText('112')).toBeInTheDocument()
    expect(within(items[0]).getByLabelText('gained 1 place')).toHaveTextContent('▲1')

    expect(within(items[1]).getByText('SEN')).toBeInTheDocument()
    expect(within(items[1]).getByText('102.5')).toBeInTheDocument()
    expect(within(items[1]).getByLabelText('lost 1 place')).toHaveTextContent('▼1')

    expect(within(items[2]).getByText('BER')).toBeInTheDocument()
    expect(within(items[2]).getByText('42')).toBeInTheDocument()
    expect(within(items[2]).getByLabelText('position unchanged')).toHaveTextContent('—')
  })

  it('shows the first 20 drivers initially and reveals the rest on "Show all"', async () => {
    const user = userEvent.setup()
    const standings = Array.from({ length: 24 }, (_, idx) => makeRow(idx + 1))

    render(
      <MotionConfig reducedMotion="always">
        <StandingsTower
          standings={standings}
          races={RACES}
          season={1988}
          systemId="1991"
          isDesktop={false}
          expandedDriverId={null}
          selectedDriverId={null}
          onSelectRow={vi.fn()}
        />
      </MotionConfig>,
    )

    const list = screen.getByRole('list', { name: 'Driver standings' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(20)
    expect(screen.queryByText('D24')).not.toBeInTheDocument()

    const showAllButton = screen.getByRole('button', { name: 'Show all 24 drivers' })
    await user.click(showAllButton)

    expect(within(list).getAllByRole('listitem')).toHaveLength(24)
    expect(screen.getByText('D24')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show top 20 drivers' })).toBeInTheDocument()
  })
})
