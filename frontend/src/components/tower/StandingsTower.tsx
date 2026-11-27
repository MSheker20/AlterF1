import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutGroup } from 'motion/react'
import type { ChampionshipMode, RaceSummary, StandingRow } from '../../api/types'
import { standingEntryId } from '../../lib/championship'
import type { StandingEntry } from '../../lib/championship'
import { TowerRow } from './TowerRow'

interface StandingsTowerProps<T extends StandingEntry = StandingRow> {
  standings: readonly T[]
  races: readonly RaceSummary[]
  season: number
  systemId: string
  isDesktop: boolean
  expandedDriverId: string | null
  selectedDriverId: string | null
  onSelectRow: (row: T, triggerEl: HTMLButtonElement) => void
  mode?: ChampionshipMode
  hideDelta?: boolean
}

const INITIAL_VISIBLE_ROWS = 20
const FLASH_DURATION_MS = 950

export function StandingsTower<T extends StandingEntry = StandingRow>({
  standings,
  races,
  season,
  systemId,
  isDesktop,
  expandedDriverId,
  selectedDriverId,
  onSelectRow,
  mode = 'drivers',
  hideDelta = false,
}: StandingsTowerProps<T>) {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const [flashByEntry, setFlashByEntry] = useState<Record<string, 'up' | 'down'>>({})

  const previousSnapshotRef = useRef<{
    mode: ChampionshipMode
    season: number
    systemId: string
    positions: Map<string, number>
  } | null>(null)

  useEffect(() => {
    const nextPositions = new Map<string, number>()
    for (const row of standings) {
      nextPositions.set(standingEntryId(row), row.position)
    }

    const prev = previousSnapshotRef.current
    previousSnapshotRef.current = { mode, season, systemId, positions: nextPositions }

    if (!prev || prev.mode !== mode || prev.season !== season || prev.systemId === systemId) {
      setFlashByEntry({})
      return
    }

    const nextFlashes: Record<string, 'up' | 'down'> = {}
    for (const row of standings) {
      const id = standingEntryId(row)
      const prevPosition = prev.positions.get(id)
      if (prevPosition !== undefined && prevPosition !== row.position) {
        nextFlashes[id] = row.position < prevPosition ? 'up' : 'down'
      }
    }

    setFlashByEntry(nextFlashes)

    if (Object.keys(nextFlashes).length === 0) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setFlashByEntry({})
    }, FLASH_DURATION_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [mode, season, systemId, standings])

  if (standings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        {t('tower.empty')}
      </div>
    )
  }

  const isConstructors = mode === 'constructors'
  const hasOverflow = standings.length > INITIAL_VISIBLE_ROWS
  const visibleRows = showAll ? standings : standings.slice(0, INITIAL_VISIBLE_ROWS)
  const headerGridClass = hideDelta
    ? 'grid-cols-[28px_4px_minmax(0,1fr)_56px]'
    : 'grid-cols-[28px_4px_minmax(0,1fr)_56px_44px]'

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <div
        aria-hidden="true"
        className={`grid ${headerGridClass} items-center gap-x-2.5 border-b border-border bg-surface px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted`}
      >
        <span className="text-right">{t('tower.colPos')}</span>
        <span />
        <span>{isConstructors ? t('tower.colConstructor') : t('tower.colDriver')}</span>
        <span className="text-right">{t('tower.colPoints')}</span>
        {!hideDelta && <span className="text-right">{t('tower.colChange')}</span>}
      </div>

      <LayoutGroup id={`standings-tower-${mode}-${season}`}>
        <ol
          aria-label={
            isConstructors ? t('tower.listAriaLabelConstructors') : t('tower.listAriaLabel')
          }
          className="m-0 list-none p-0"
        >
          {visibleRows.map((row) => {
            const id = standingEntryId(row)
            return (
              <TowerRow
                key={id}
                row={row}
                races={races}
                season={season}
                systemId={systemId}
                isDesktop={isDesktop}
                isExpanded={isDesktop && expandedDriverId === id}
                isSelected={!isDesktop && selectedDriverId === id}
                flashDirection={flashByEntry[id] ?? null}
                hideDelta={hideDelta}
                onSelect={onSelectRow}
              />
            )
          })}
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
              ? t(isConstructors ? 'tower.showTopConstructors' : 'tower.showTop', {
                  limit: INITIAL_VISIBLE_ROWS,
                })
              : t(isConstructors ? 'tower.showAllConstructors' : 'tower.showAll', {
                  total: standings.length,
                })}
          </button>
        </div>
      )}
    </div>
  )
}
