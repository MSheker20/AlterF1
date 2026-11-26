import { useEffect, useRef, useState } from 'react'
import { LayoutGroup } from 'motion/react'
import type { RaceSummary, StandingRow } from '../../api/types'
import { strings } from '../../i18n/strings'
import { TowerRow } from './TowerRow'

interface StandingsTowerProps {
  standings: readonly StandingRow[]
  races: readonly RaceSummary[]
  season: number
  systemId: string
  isDesktop: boolean
  expandedDriverId: string | null
  selectedDriverId: string | null
  onSelectRow: (row: StandingRow, triggerEl: HTMLButtonElement) => void
}

const INITIAL_VISIBLE_ROWS = 20
const FLASH_DURATION_MS = 950

export function StandingsTower({
  standings,
  races,
  season,
  systemId,
  isDesktop,
  expandedDriverId,
  selectedDriverId,
  onSelectRow,
}: StandingsTowerProps) {
  const [showAll, setShowAll] = useState(false)
  const [flashByDriver, setFlashByDriver] = useState<Record<string, 'up' | 'down'>>({})

  const previousSnapshotRef = useRef<{
    season: number
    systemId: string
    positions: Map<string, number>
  } | null>(null)

  useEffect(() => {
    const nextPositions = new Map<string, number>()
    for (const row of standings) {
      nextPositions.set(row.driverId, row.position)
    }

    const prev = previousSnapshotRef.current
    previousSnapshotRef.current = { season, systemId, positions: nextPositions }

    if (!prev || prev.season !== season || prev.systemId === systemId) {
      setFlashByDriver({})
      return
    }

    const nextFlashes: Record<string, 'up' | 'down'> = {}
    for (const row of standings) {
      const prevPosition = prev.positions.get(row.driverId)
      if (prevPosition !== undefined && prevPosition !== row.position) {
        nextFlashes[row.driverId] = row.position < prevPosition ? 'up' : 'down'
      }
    }

    setFlashByDriver(nextFlashes)

    if (Object.keys(nextFlashes).length === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setFlashByDriver({})
    }, FLASH_DURATION_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [season, systemId, standings])

  if (standings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        {strings.tower.empty}
      </div>
    )
  }

  const hasOverflow = standings.length > INITIAL_VISIBLE_ROWS
  const visibleRows = showAll ? standings : standings.slice(0, INITIAL_VISIBLE_ROWS)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <div
        aria-hidden="true"
        className="grid grid-cols-[28px_4px_minmax(0,1fr)_56px_44px] items-center gap-x-2.5 border-b border-border bg-surface px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted"
      >
        <span className="text-right">{strings.tower.colPos}</span>
        <span />
        <span>{strings.tower.colDriver}</span>
        <span className="text-right">{strings.tower.colPoints}</span>
        <span className="text-right">{strings.tower.colChange}</span>
      </div>

      <LayoutGroup id={`standings-tower-${season}`}>
        <ol aria-label={strings.tower.listAriaLabel} className="m-0 list-none p-0">
          {visibleRows.map((row) => (
            <TowerRow
              key={row.driverId}
              row={row}
              races={races}
              season={season}
              systemId={systemId}
              isDesktop={isDesktop}
              isExpanded={isDesktop && expandedDriverId === row.driverId}
              isSelected={!isDesktop && selectedDriverId === row.driverId}
              flashDirection={flashByDriver[row.driverId] ?? null}
              onSelect={onSelectRow}
            />
          ))}
        </ol>
      </LayoutGroup>

      {hasOverflow && (
        <div className="border-t border-border bg-surface p-2">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="w-full cursor-pointer rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-[#3a4250] hover:bg-[#222731]"
          >
            {showAll
              ? strings.tower.showTop(INITIAL_VISIBLE_ROWS)
              : strings.tower.showAll(standings.length)}
          </button>
        </div>
      )}
    </div>
  )
}
