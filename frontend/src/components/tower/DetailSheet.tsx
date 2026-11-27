import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import type { RaceSummary, StandingRow } from '../../api/types'
import { systemContext, systemLabel } from '../../i18n/system'
import { deltaLabel, fallbackDriverCode, formatPoints } from '../../lib/format'
import { teamColor } from '../../lib/teamColors'
import { RaceResultsGrid } from './RaceResultsGrid'

interface DetailSheetProps {
  row: StandingRow | null
  races: readonly RaceSummary[]
  season: number
  systemId: string
  restoreFocusTo: HTMLButtonElement | null
  onClose: () => void
}

const SHEET_EASE = [0.2, 0.8, 0.2, 1] as const
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function DetailSheet({
  row,
  races,
  season,
  systemId,
  restoreFocusTo,
  onClose,
}: DetailSheetProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (row === null) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false
        restoreFocusTo?.focus()
      }
      return
    }

    const justOpened = !wasOpenRef.current
    wasOpenRef.current = true
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (justOpened) {
      closeButtonRef.current?.focus({ preventScroll: true })
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !dialogRef.current.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !dialogRef.current.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [row, onClose, restoreFocusTo])

  return (
    <AnimatePresence>
      {row !== null && (
        <motion.div
          key="detail-sheet-backdrop"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/65"
        />
      )}

      {row !== null && (
        <motion.div
          key="detail-sheet-panel"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.28, ease: SHEET_EASE }}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-2xl"
        >
          <div
            aria-hidden="true"
            className="mx-auto mb-1.5 mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border"
          />

          <div className="flex items-center justify-between gap-3 border-b border-border px-4 pb-3 pt-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-9 w-1 shrink-0 rounded-[2px]"
                style={{ backgroundColor: teamColor(row.constructorId) }}
              />
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-base font-bold leading-tight text-text">
                  {row.driverName}
                </h2>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {fallbackDriverCode(row.driverCode, row.driverName)} · {row.constructorName}
                </p>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              aria-label={t('detail.closeSheet')}
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface-2 text-lg leading-none text-text transition-colors hover:border-[#3d4552]"
            >
              &times;
            </button>
          </div>

          <div
            role="region"
            tabIndex={0}
            aria-label={t('detail.sheetBodyAria')}
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 focus-visible:outline-offset-[-2px]"
          >
            <SheetStats row={row} season={season} systemId={systemId} />

            <div>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                {t('detail.raceResultsHeading', { count: races.length })}
              </h3>
              <RaceResultsGrid races={races} results={row.results} variant="chips" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface SheetStatsProps {
  row: StandingRow
  season: number
  systemId: string
}

function SheetStats({ row, season, systemId }: SheetStatsProps) {
  const { t } = useTranslation()
  const delta = deltaLabel(t, row.positionChange)
  const deltaColor =
    delta.direction === 'up'
      ? 'text-ok'
      : delta.direction === 'down'
        ? 'text-err'
        : 'text-muted'

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-bg px-2.5 py-2">
        <dt className="text-[10px] font-bold uppercase tracking-[0.05em] text-muted">
          {t('detail.systemLabel', {
            context: systemContext(systemId),
            system: systemLabel(t, systemId),
          })}
        </dt>
        <dd className="flex flex-col gap-0.5 tabular-nums">
          <span className="flex items-baseline gap-1.5 text-[15px] font-bold text-text">
            <span>{formatPoints(row.points)}</span>
            <span className={`text-[11px] font-bold ${deltaColor}`}>
              <span aria-hidden="true">{delta.text}</span>
              <span className="sr-only">{delta.ariaLabel}</span>
            </span>
          </span>
          <span className="text-[11px] font-normal text-muted">
            {t('detail.positionBadge', { position: row.position })}
          </span>
        </dd>
      </div>

      <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-bg px-2.5 py-2">
        <dt className="text-[10px] font-bold uppercase tracking-[0.05em] text-muted">
          {t('detail.realLabel', { season })}
        </dt>
        <dd className="flex flex-col gap-0.5 tabular-nums">
          <span className="text-[15px] font-bold text-text">
            {row.realPoints !== null ? formatPoints(row.realPoints) : '—'}
          </span>
          <span className="text-[11px] font-normal text-muted">
            {row.realPosition !== null
              ? t('detail.positionBadge', { position: row.realPosition })
              : t('detail.unclassified')}
          </span>
        </dd>
      </div>

      <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-bg px-2.5 py-2">
        <dt className="text-[10px] font-bold uppercase tracking-[0.05em] text-muted">
          {t('detail.winsLabel')}
        </dt>
        <dd className="text-[15px] font-bold tabular-nums text-text">{row.wins}</dd>
      </div>

      <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-bg px-2.5 py-2">
        <dt className="text-[10px] font-bold uppercase tracking-[0.05em] text-muted">
          {t('detail.podiumsLabel')}
        </dt>
        <dd className="text-[15px] font-bold tabular-nums text-text">{row.podiums}</dd>
      </div>
    </dl>
  )
}
