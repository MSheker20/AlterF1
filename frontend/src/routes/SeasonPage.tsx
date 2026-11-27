import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QueryErrorState } from '../components/season/ErrorPanel'
import { SeasonLayout } from '../components/season/SeasonLayout'
import { useSeasonLayout } from '../components/season/seasonLayoutContext'
import { CompareSlope } from '../components/tower/CompareSlope'
import { DetailSheet } from '../components/tower/DetailSheet'
import { SeasonNotes } from '../components/tower/SeasonNotes'
import type { DisplaySeasonNote } from '../components/tower/SeasonNotes'
import { StandingsTower } from '../components/tower/StandingsTower'
import { standingEntryId } from '../lib/championship'
import type { StandingEntry } from '../lib/championship'

const SKELETON_ROW_KEYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

export function TowerTab() {
  const { t } = useTranslation()
  const {
    mode,
    year,
    isDesktop,
    displayStandings,
    standingsIsError,
    standingsError,
    showStandingsPageError,
    refetchStandings,
  } = useSeasonLayout()

  const [mobileView, setMobileView] = useState<'tower' | 'compare'>('tower')
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [sheetEntryId, setSheetEntryId] = useState<string | null>(null)
  const [sheetTrigger, setSheetTrigger] = useState<HTMLButtonElement | null>(null)

  // A new season or championship closes any open row detail (state adjusted during render).
  const scopeKey = `${mode}:${year}`
  const [shownScope, setShownScope] = useState(scopeKey)
  if (scopeKey !== shownScope) {
    setShownScope(scopeKey)
    setExpandedEntryId(null)
    setSheetEntryId(null)
    setSheetTrigger(null)
    setMobileView('tower')
  }

  // The bottom sheet is mobile-only: switching to desktop closes it.
  if (isDesktop && sheetEntryId !== null) {
    setSheetEntryId(null)
  }

  const handleSelectRow = useCallback(
    (row: StandingEntry, triggerEl: HTMLButtonElement) => {
      const id = standingEntryId(row)
      if (isDesktop) {
        setExpandedEntryId((prev) => (prev === id ? null : id))
      } else {
        setSheetTrigger(triggerEl)
        setSheetEntryId(id)
      }
    },
    [isDesktop],
  )

  const handleCloseSheet = useCallback(() => {
    setSheetEntryId(null)
  }, [])

  const sheetRow =
    sheetEntryId !== null && displayStandings
      ? (displayStandings.standings.find((row) => standingEntryId(row) === sheetEntryId) ?? null)
      : null

  const hideDelta = displayStandings?.alternative ?? false
  const effectiveMobileView = hideDelta ? 'tower' : mobileView

  const displayNotes: DisplaySeasonNote[] = displayStandings
    ? displayStandings.bestCarOnly
      ? ['best-car-only', ...displayStandings.notes]
      : displayStandings.notes
    : []

  return (
    <>
      {showStandingsPageError && (
        <QueryErrorState error={standingsError} onRetry={refetchStandings} />
      )}

      {!displayStandings ? (
        standingsIsError ? null : (
          <StandingsSkeleton isDesktop={isDesktop} />
        )
      ) : isDesktop ? (
        hideDelta ? (
          <div className="max-w-3xl">
            <StandingsTower
              key={`${displayStandings.mode}-${displayStandings.season}`}
              standings={displayStandings.standings}
              races={displayStandings.races}
              season={displayStandings.season}
              systemId={displayStandings.system}
              mode={displayStandings.mode}
              hideDelta
              isDesktop
              expandedDriverId={expandedEntryId}
              selectedDriverId={null}
              onSelectRow={handleSelectRow}
            />
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(340px,430px)] items-start gap-6">
            <StandingsTower
              key={`${displayStandings.mode}-${displayStandings.season}`}
              standings={displayStandings.standings}
              races={displayStandings.races}
              season={displayStandings.season}
              systemId={displayStandings.system}
              mode={displayStandings.mode}
              isDesktop
              expandedDriverId={expandedEntryId}
              selectedDriverId={null}
              onSelectRow={handleSelectRow}
            />

            <div className="sticky top-20">
              <CompareSlope
                key={`${displayStandings.mode}-${displayStandings.season}`}
                standings={displayStandings.standings}
                systemId={displayStandings.system}
                realSystem={displayStandings.realSystem}
                mode={displayStandings.mode}
              />
            </div>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {!hideDelta && (
            <div
              role="group"
              aria-label={t('controls.viewModeLabel')}
              className="inline-flex w-full rounded-lg border border-border bg-surface p-[3px] sm:w-auto"
            >
              <button
                type="button"
                aria-pressed={effectiveMobileView === 'tower'}
                onClick={() => setMobileView('tower')}
                className={`flex-1 cursor-pointer rounded-[6px] px-4 py-1.5 text-xs font-semibold transition-colors sm:flex-none ${
                  effectiveMobileView === 'tower'
                    ? 'bg-surface-2 text-text ring-1 ring-inset ring-[#363d48]'
                    : 'text-muted hover:text-text'
                }`}
              >
                {t('controls.towerTab')}
              </button>
              <button
                type="button"
                aria-pressed={effectiveMobileView === 'compare'}
                onClick={() => setMobileView('compare')}
                className={`flex-1 cursor-pointer rounded-[6px] px-4 py-1.5 text-xs font-semibold transition-colors sm:flex-none ${
                  effectiveMobileView === 'compare'
                    ? 'bg-surface-2 text-text ring-1 ring-inset ring-[#363d48]'
                    : 'text-muted hover:text-text'
                }`}
              >
                {t('controls.compareTab')}
              </button>
            </div>
          )}

          {effectiveMobileView === 'tower' ? (
            <>
              <StandingsTower
                key={`${displayStandings.mode}-${displayStandings.season}`}
                standings={displayStandings.standings}
                races={displayStandings.races}
                season={displayStandings.season}
                systemId={displayStandings.system}
                mode={displayStandings.mode}
                hideDelta={hideDelta}
                isDesktop={false}
                expandedDriverId={null}
                selectedDriverId={sheetEntryId}
                onSelectRow={handleSelectRow}
              />
              <DetailSheet
                row={sheetRow}
                races={displayStandings.races}
                season={displayStandings.season}
                systemId={displayStandings.system}
                restoreFocusTo={sheetTrigger}
                hideDelta={hideDelta}
                onClose={handleCloseSheet}
              />
            </>
          ) : (
            <CompareSlope
              key={`${displayStandings.mode}-${displayStandings.season}`}
              standings={displayStandings.standings}
              systemId={displayStandings.system}
              realSystem={displayStandings.realSystem}
              mode={displayStandings.mode}
            />
          )}
        </div>
      )}

      {displayStandings && <SeasonNotes notes={displayNotes} mode={displayStandings.mode} />}
    </>
  )
}

export function SeasonPage() {
  return (
    <SeasonLayout>
      <TowerTab />
    </SeasonLayout>
  )
}

function StandingsSkeleton({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div
      aria-busy="true"
      className={
        isDesktop
          ? 'grid grid-cols-[minmax(0,1fr)_minmax(340px,430px)] items-start gap-6'
          : 'block'
      }
    >
      <div className="overflow-hidden rounded-lg border border-border bg-bg">
        <div className="h-8 border-b border-border bg-surface" />
        {SKELETON_ROW_KEYS.map((key) => (
          <div
            key={key}
            className="grid h-11 grid-cols-[28px_4px_minmax(0,1fr)_56px_44px] items-center gap-x-2.5 border-b border-border/75 px-3.5"
          >
            <div className="ml-auto h-3.5 w-4 rounded bg-surface-2 motion-safe:animate-pulse" />
            <div className="h-6 w-1 rounded-[2px] bg-surface-2 motion-safe:animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-12 rounded bg-surface-2 motion-safe:animate-pulse" />
              <div className="h-2.5 w-20 rounded bg-surface motion-safe:animate-pulse" />
            </div>
            <div className="ml-auto h-3.5 w-8 rounded bg-surface-2 motion-safe:animate-pulse" />
            <div className="ml-auto h-3 w-6 rounded bg-surface motion-safe:animate-pulse" />
          </div>
        ))}
      </div>

      {isDesktop && (
        <div className="h-[540px] rounded-lg border border-border bg-surface motion-safe:animate-pulse" />
      )}
    </div>
  )
}
