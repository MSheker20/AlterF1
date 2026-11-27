import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import type { RaceSummary, StandingRow } from '../../api/types'
import { systemContext, systemLabel } from '../../i18n/system'
import { deltaLabel, fallbackDriverCode, formatPoints } from '../../lib/format'
import { teamColor } from '../../lib/teamColors'
import { RaceResultsGrid } from './RaceResultsGrid'

interface TowerRowProps {
  row: StandingRow
  races: readonly RaceSummary[]
  season: number
  systemId: string
  isDesktop: boolean
  isExpanded: boolean
  isSelected: boolean
  flashDirection: 'up' | 'down' | null
  onSelect: (row: StandingRow, triggerEl: HTMLButtonElement) => void
}

const ROW_EASE = [0.2, 0.8, 0.2, 1] as const
const ROW_TRANSITION = {
  layout: { duration: 0.6, ease: ROW_EASE },
}

export function TowerRow({
  row,
  races,
  season,
  systemId,
  isDesktop,
  isExpanded,
  isSelected,
  flashDirection,
  onSelect,
}: TowerRowProps) {
  const { t } = useTranslation()
  const color = teamColor(row.constructorId)
  const delta = deltaLabel(t, row.positionChange)
  const code = fallbackDriverCode(row.driverCode, row.driverName)

  const deltaColorClass =
    delta.direction === 'up'
      ? 'font-bold text-ok'
      : delta.direction === 'down'
        ? 'font-bold text-err'
        : 'font-medium text-muted'

  const flashClass =
    flashDirection === 'up'
      ? 'tower-flash-up'
      : flashDirection === 'down'
        ? 'tower-flash-down'
        : ''

  return (
    <motion.li
      layout="position"
      transition={ROW_TRANSITION}
      className="border-b border-border/75 bg-bg"
    >
      <button
        type="button"
        title={row.driverName}
        aria-expanded={isDesktop ? isExpanded : undefined}
        onClick={(event) => onSelect(row, event.currentTarget)}
        className={`grid h-11 w-full cursor-pointer grid-cols-[28px_4px_minmax(0,1fr)_56px_44px] items-center gap-x-2.5 px-3.5 text-left transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-offset-[-2px] ${
          isExpanded || isSelected ? 'bg-surface' : ''
        } ${flashClass}`}
      >
        <span
          className={`text-right text-sm font-bold tabular-nums ${
            row.position === 1 ? 'text-gold' : 'text-text'
          }`}
        >
          {row.position}
        </span>

        <span
          aria-hidden="true"
          className="block h-6 w-1 rounded-[2px]"
          style={{ backgroundColor: color }}
        />

        <span className="flex min-w-0 flex-col justify-center gap-0.5">
          <span className="truncate text-sm font-extrabold uppercase leading-none tracking-[0.08em] text-text">
            <span>{code}</span>
            <span className="sr-only"> ({row.driverName})</span>
          </span>
          <span className="truncate text-[11px] leading-none text-muted">
            {row.constructorName}
          </span>
        </span>

        <span className="text-right text-sm font-bold tabular-nums text-text">
          {formatPoints(row.points)}
        </span>

        <span className={`text-right text-xs tabular-nums ${deltaColorClass}`}>
          <span aria-hidden="true">{delta.text}</span>
          <span className="sr-only">{delta.ariaLabel}</span>
        </span>
      </button>

      {isDesktop && isExpanded && (
        <div className="border-t border-border/70 bg-surface px-3.5 py-3">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="h-4 w-1 shrink-0 rounded-[2px]"
                style={{ backgroundColor: color }}
              />
              <span className="truncate text-sm font-semibold text-text">
                {row.driverName}
              </span>
              <span className="text-xs text-muted">{row.constructorName}</span>
            </div>

            <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-muted">
              <div className="flex items-baseline gap-1">
                <dt>{t('detail.realLabel', { season })}:</dt>
                <dd className="font-semibold text-text">
                  {row.realPoints !== null ? formatPoints(row.realPoints) : '—'}{' '}
                  <span className="font-normal text-muted">
                    (
                    {row.realPosition !== null
                      ? t('detail.positionBadge', { position: row.realPosition })
                      : t('detail.unclassified')}
                    )
                  </span>
                </dd>
              </div>
              <div className="flex items-baseline gap-1">
                <dt>
                  {t('detail.systemLabel', {
                    context: systemContext(systemId),
                    system: systemLabel(t, systemId),
                  })}
                  :
                </dt>
                <dd className="font-semibold text-text">
                  {formatPoints(row.points)}{' '}
                  <span className="font-normal text-muted">
                    ({t('detail.positionBadge', { position: row.position })})
                  </span>
                </dd>
              </div>
              <div className="flex items-baseline gap-1">
                <dt>{t('detail.winsLabel')}:</dt>
                <dd className="font-semibold text-text">{row.wins}</dd>
              </div>
              <div className="flex items-baseline gap-1">
                <dt>{t('detail.podiumsLabel')}:</dt>
                <dd className="font-semibold text-text">{row.podiums}</dd>
              </div>
            </dl>
          </div>

          <RaceResultsGrid races={races} results={row.results} variant="table" />
        </div>
      )}
    </motion.li>
  )
}
