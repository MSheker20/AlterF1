import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { useSeasons, useStandings, useSystems } from '../api/standings'
import type { StandingRow, StandingsResponse, SystemId } from '../api/types'
import { HealthBadge } from '../components/HealthBadge'
import { ActiveScenarioChips } from '../components/scenario/ActiveScenarioChips'
import { ScenarioPanel } from '../components/scenario/ScenarioPanel'
import type { ScenarioInlineErrors } from '../components/scenario/ScenarioPanel'
import { ChampionHeadline } from '../components/tower/ChampionHeadline'
import { CompareSlope } from '../components/tower/CompareSlope'
import { DetailSheet } from '../components/tower/DetailSheet'
import { StandingsTower } from '../components/tower/StandingsTower'
import { SystemPicker } from '../components/tower/SystemPicker'
import { YearSelect } from '../components/tower/YearSelect'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { strings } from '../i18n/strings'
import {
  countActive,
  countActivePayload,
  createDefaultCustomConfig,
  createDefaultScenario,
  customFromRules,
  defaultSystemForYear,
  isKnownSystemId,
  parseScenario,
  scenarioForYearChange,
  scenarioToParams,
} from '../lib/scenario'
import type { Scenario } from '../lib/scenario'

const DEFAULT_ROUTE = '/season/1988?system=1991'
const SKELETON_ROW_KEYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

function parseYearParam(rawYear: string | undefined): number | null {
  if (!rawYear || !/^\d{4}$/.test(rawYear)) {
    return null
  }
  const year = Number.parseInt(rawYear, 10)
  return Number.isInteger(year) && year > 0 ? year : null
}

function mapInlineScenarioError(
  error: unknown,
  panelOpen: boolean,
  isCustomSystem: boolean,
): { inlineErrors: ScenarioInlineErrors; handledInPanel: boolean } {
  if (!panelOpen || !(error instanceof ApiError) || error.status !== 400) {
    return { inlineErrors: {}, handledInPanel: false }
  }

  const detail = error.detail || error.title

  switch (error.field) {
    case 'custom':
      return {
        inlineErrors: isCustomSystem ? { customPoints: detail } : { general: detail },
        handledInPanel: true,
      }
    case 'customFl':
      return {
        inlineErrors: isCustomSystem ? { customFl: detail } : { general: detail },
        handledInPanel: true,
      }
    case 'customSprint':
      return {
        inlineErrors: isCustomSystem ? { customSprint: detail } : { general: detail },
        handledInPanel: true,
      }
    case 'customBest':
      return {
        inlineErrors: isCustomSystem ? { customBest: detail } : { general: detail },
        handledInPanel: true,
      }
    case 'exclude':
      return { inlineErrors: { drivers: detail }, handledInPanel: true }
    case 'skip':
      return { inlineErrors: { races: detail }, handledInPanel: true }
    case 'sprint':
    case 'fl':
      return { inlineErrors: { bonuses: detail }, handledInPanel: true }
    case 'preset':
      return { inlineErrors: { preset: detail }, handledInPanel: true }
    default:
      return { inlineErrors: { general: detail }, handledInPanel: true }
  }
}

export function SeasonPage() {
  const { year: rawYear } = useParams<{ year: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const parsedYear = parseYearParam(rawYear)
  const scenario = useMemo(
    () => parseScenario(searchParams, defaultSystemForYear(parsedYear)),
    [searchParams, parsedYear],
  )
  const activeScenarioCount = useMemo(() => countActive(scenario), [scenario])

  const seasonsQuery = useSeasons()
  const systemsQuery = useSystems()
  const standingsQuery = useStandings(parsedYear, scenario)

  const [mobileView, setMobileView] = useState<'tower' | 'compare'>('tower')
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null)
  const [sheetDriverId, setSheetDriverId] = useState<string | null>(null)
  const [sheetTrigger, setSheetTrigger] = useState<HTMLButtonElement | null>(null)
  const [scenarioOpen, setScenarioOpen] = useState(false)
  const scenarioButtonRef = useRef<HTMLButtonElement | null>(null)

  // Keep last successful standings for the same season visible during 400 errors.
  const [lastStandings, setLastStandings] = useState<StandingsResponse | null>(null)
  if (
    standingsQuery.data &&
    standingsQuery.data.season === parsedYear &&
    standingsQuery.data !== lastStandings
  ) {
    setLastStandings(standingsQuery.data)
  }
  if (lastStandings !== null && lastStandings.season !== parsedYear) {
    setLastStandings(null)
  }

  // A new season closes any open driver detail and scenario panel (state adjusted during render, no effect).
  const [shownYear, setShownYear] = useState(parsedYear)
  if (parsedYear !== shownYear) {
    setShownYear(parsedYear)
    setExpandedDriverId(null)
    setSheetDriverId(null)
    setSheetTrigger(null)
    setScenarioOpen(false)
  }
  // The bottom sheet is mobile-only: switching to desktop closes it.
  if (isDesktop && sheetDriverId !== null) {
    setSheetDriverId(null)
  }

  const { inlineErrors, handledInPanel } = useMemo(
    () =>
      mapInlineScenarioError(
        standingsQuery.isError ? standingsQuery.error : null,
        scenarioOpen,
        scenario.system === 'custom',
      ),
    [standingsQuery.isError, standingsQuery.error, scenarioOpen, scenario.system],
  )

  const showPageError = standingsQuery.isError && !handledInPanel
  const displayStandings = standingsQuery.isError
    ? handledInPanel
      ? lastStandings
      : null
    : (standingsQuery.data ?? null)

  const updateScenario = useCallback(
    (updater: (prev: Scenario) => Scenario) => {
      setSearchParams(
        (prevParams) => {
          const prevScenario = parseScenario(prevParams, defaultSystemForYear(parsedYear))
          return scenarioToParams(updater(prevScenario))
        },
        { replace: true },
      )
    },
    [parsedYear, setSearchParams],
  )

  const handleSystemChange = useCallback(
    (nextSystem: SystemId) => {
      if (nextSystem === 'custom') {
        updateScenario((prev) => ({
          ...prev,
          system: 'custom',
          custom:
            prev.custom ??
            (displayStandings
              ? customFromRules(displayStandings.rules)
              : createDefaultCustomConfig()),
        }))
        setScenarioOpen(true)
        return
      }

      updateScenario((prev) => ({
        ...prev,
        system: nextSystem,
        custom: null,
      }))
    },
    [displayStandings, updateScenario],
  )

  const handleYearChange = useCallback(
    (nextYear: number) => {
      setScenarioOpen(false)
      const rawSystem = searchParams.get('system')?.trim()
      const hasExplicitSystem = isKnownSystemId(rawSystem)
      const nextScenario = scenarioForYearChange(scenario, hasExplicitSystem, nextYear)
      navigate(`/season/${nextYear}?${scenarioToParams(nextScenario).toString()}`)
    },
    [navigate, scenario, searchParams],
  )

  const handleResetScenario = useCallback(() => {
    updateScenario(() => createDefaultScenario(defaultSystemForYear(parsedYear)))
  }, [parsedYear, updateScenario])

  const handleSelectRow = useCallback(
    (row: StandingRow, triggerEl: HTMLButtonElement) => {
      if (isDesktop) {
        setExpandedDriverId((prev) => (prev === row.driverId ? null : row.driverId))
      } else {
        setSheetTrigger(triggerEl)
        setSheetDriverId(row.driverId)
      }
    },
    [isDesktop],
  )

  const handleCloseSheet = useCallback(() => {
    setSheetDriverId(null)
  }, [])

  const handleCloseScenario = useCallback(() => {
    setScenarioOpen(false)
  }, [])

  const seasons = seasonsQuery.data ?? []
  const systems = systemsQuery.data ?? []
  const sheetRow =
    sheetDriverId !== null && displayStandings
      ? (displayStandings.standings.find((row) => row.driverId === sheetDriverId) ?? null)
      : null

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link
            to={DEFAULT_ROUTE}
            className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-text no-underline transition-opacity hover:opacity-90"
          >
            <span aria-hidden="true" className="h-5 w-1 rounded-[2px] bg-accent" />
            <span>{strings.brand}</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <YearSelect
              seasons={seasons}
              selectedYear={parsedYear}
              onChange={handleYearChange}
            />
            <SystemPicker
              systems={systems}
              selectedSystem={scenario.system}
              realSystem={displayStandings?.realSystem ?? null}
              onChange={handleSystemChange}
              disabled={parsedYear === null}
            />
            <button
              ref={scenarioButtonRef}
              type="button"
              disabled={parsedYear === null}
              aria-expanded={scenarioOpen}
              aria-haspopup="dialog"
              aria-label={strings.scenario.buttonAriaWithCount(activeScenarioCount)}
              onClick={() => setScenarioOpen((prev) => !prev)}
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors sm:text-[13px] disabled:cursor-not-allowed disabled:opacity-50 ${
                scenarioOpen || activeScenarioCount > 0
                  ? 'border-[#3a4250] bg-surface-2 text-text'
                  : 'border-border bg-surface text-text hover:border-[#363d48]'
              }`}
            >
              <span>{strings.scenario.buttonLabel}</span>
              {activeScenarioCount > 0 && (
                <span
                  aria-hidden="true"
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none tabular-nums text-white"
                >
                  {activeScenarioCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        {parsedYear === null ? (
          <section className="max-w-lg space-y-4">
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {strings.page.invalidSeasonTitle}
            </h1>
            <ErrorPanel
              title={strings.page.invalidSeasonTitle}
              detail={strings.page.invalidSeasonDetail(rawYear ?? '')}
              showBackLink
            />
          </section>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h1 className="text-xl font-bold tracking-tight tabular-nums text-text sm:text-2xl">
                  {strings.page.seasonHeading(parsedYear)}
                </h1>
              </div>

              {displayStandings ? (
                <ChampionHeadline
                  season={displayStandings.season}
                  champion={displayStandings.champion}
                  realChampion={displayStandings.realChampion}
                  championChanged={displayStandings.championChanged}
                  rules={displayStandings.rules}
                  selectedSystemId={displayStandings.system}
                  activeScenarioCount={countActivePayload(
                    displayStandings.scenario,
                    displayStandings.system,
                  )}
                />
              ) : standingsQuery.isError ? null : (
                <HeadlineSkeleton />
              )}

              <ActiveScenarioChips
                scenario={scenario}
                entrants={displayStandings?.entrants ?? []}
                races={displayStandings?.races ?? []}
                season={parsedYear}
                onChangeScenario={updateScenario}
              />
            </div>

            {showPageError && (
              <StandingsErrorState
                error={standingsQuery.error}
                onRetry={() => {
                  void standingsQuery.refetch()
                }}
              />
            )}

            {!displayStandings ? (
              standingsQuery.isError ? null : (
                <StandingsSkeleton isDesktop={isDesktop} />
              )
            ) : isDesktop ? (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(340px,430px)] items-start gap-6">
                <StandingsTower
                  key={displayStandings.season}
                  standings={displayStandings.standings}
                  races={displayStandings.races}
                  season={displayStandings.season}
                  systemId={displayStandings.system}
                  isDesktop
                  expandedDriverId={expandedDriverId}
                  selectedDriverId={null}
                  onSelectRow={handleSelectRow}
                />

                <div className="sticky top-20">
                  <CompareSlope
                    key={displayStandings.season}
                    standings={displayStandings.standings}
                    systemId={displayStandings.system}
                    realSystem={displayStandings.realSystem}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  role="group"
                  aria-label={strings.controls.viewModeLabel}
                  className="inline-flex w-full rounded-lg border border-border bg-surface p-[3px] sm:w-auto"
                >
                  <button
                    type="button"
                    aria-pressed={mobileView === 'tower'}
                    onClick={() => setMobileView('tower')}
                    className={`flex-1 cursor-pointer rounded-[6px] px-4 py-1.5 text-xs font-semibold transition-colors sm:flex-none ${
                      mobileView === 'tower'
                        ? 'bg-surface-2 text-text ring-1 ring-inset ring-[#363d48]'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    {strings.controls.towerTab}
                  </button>
                  <button
                    type="button"
                    aria-pressed={mobileView === 'compare'}
                    onClick={() => setMobileView('compare')}
                    className={`flex-1 cursor-pointer rounded-[6px] px-4 py-1.5 text-xs font-semibold transition-colors sm:flex-none ${
                      mobileView === 'compare'
                        ? 'bg-surface-2 text-text ring-1 ring-inset ring-[#363d48]'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    {strings.controls.compareTab}
                  </button>
                </div>

                {mobileView === 'tower' ? (
                  <>
                    <StandingsTower
                      key={displayStandings.season}
                      standings={displayStandings.standings}
                      races={displayStandings.races}
                      season={displayStandings.season}
                      systemId={displayStandings.system}
                      isDesktop={false}
                      expandedDriverId={null}
                      selectedDriverId={sheetDriverId}
                      onSelectRow={handleSelectRow}
                    />
                    <DetailSheet
                      row={sheetRow}
                      races={displayStandings.races}
                      season={displayStandings.season}
                      systemId={displayStandings.system}
                      restoreFocusTo={sheetTrigger}
                      onClose={handleCloseSheet}
                    />
                  </>
                ) : (
                  <CompareSlope
                    key={displayStandings.season}
                    standings={displayStandings.standings}
                    systemId={displayStandings.system}
                    realSystem={displayStandings.realSystem}
                  />
                )}
              </div>
            )}

            <ScenarioPanel
              key={parsedYear}
              open={scenarioOpen}
              isDesktop={isDesktop}
              season={parsedYear}
              scenario={scenario}
              entrants={displayStandings?.entrants ?? []}
              races={displayStandings?.races ?? []}
              rules={displayStandings?.rules ?? null}
              restoreFocusRef={scenarioButtonRef}
              inlineErrors={inlineErrors}
              onChangeScenario={updateScenario}
              onReset={handleResetScenario}
              onClose={handleCloseScenario}
            />
          </>
        )}
      </main>

      <footer className="mt-8 border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-muted sm:px-6">
          <p className="m-0">
            {strings.footer.dataPrefix}
            <a
              href="https://github.com/f1db/f1db"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-border underline-offset-4 transition-colors hover:text-text"
            >
              {strings.footer.f1dbName}
            </a>
            {strings.footer.licenseSuffix}
          </p>
          <HealthBadge />
        </div>
      </footer>
    </div>
  )
}

interface ErrorPanelProps {
  title: string
  detail: string
  showBackLink?: boolean
  onRetry?: () => void
}

function ErrorPanel({ title, detail, showBackLink = false, onRetry }: ErrorPanelProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-border bg-surface p-5 border-l-[3px] border-l-err"
    >
      <p className="m-0 text-sm font-semibold text-text">{title}</p>
      {detail && <p className="mt-1.5 text-sm text-muted">{detail}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer rounded-md border border-border bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-text transition-colors hover:border-[#3a4250]"
          >
            {strings.page.retry}
          </button>
        )}
        {showBackLink && (
          <Link
            to={DEFAULT_ROUTE}
            className="inline-flex items-center rounded-md border border-border px-3.5 py-1.5 text-xs font-semibold text-text no-underline transition-colors hover:bg-surface-2"
          >
            {strings.page.backToDefaultSeason}
          </Link>
        )}
      </div>
    </div>
  )
}

interface StandingsErrorStateProps {
  error: unknown
  onRetry: () => void
}

function StandingsErrorState({ error, onRetry }: StandingsErrorStateProps) {
  if (error instanceof ApiError) {
    return (
      <ErrorPanel
        title={error.title}
        detail={error.detail}
        showBackLink={error.status === 400 || error.status === 404}
        onRetry={onRetry}
      />
    )
  }

  return (
    <ErrorPanel
      title={strings.page.genericErrorTitle}
      detail={error instanceof Error ? error.message : strings.page.genericErrorDetail}
      onRetry={onRetry}
    />
  )
}

function HeadlineSkeleton() {
  return (
    <div aria-busy="true" className="space-y-2">
      <div className="h-[62px] motion-safe:animate-pulse rounded-md border border-border bg-surface" />
      <div className="h-3.5 w-48 motion-safe:animate-pulse rounded bg-surface" />
    </div>
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
            <div className="ml-auto h-3.5 w-4 motion-safe:animate-pulse rounded bg-surface-2" />
            <div className="h-6 w-1 motion-safe:animate-pulse rounded-[2px] bg-surface-2" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-12 motion-safe:animate-pulse rounded bg-surface-2" />
              <div className="h-2.5 w-20 motion-safe:animate-pulse rounded bg-surface" />
            </div>
            <div className="ml-auto h-3.5 w-8 motion-safe:animate-pulse rounded bg-surface-2" />
            <div className="ml-auto h-3 w-6 motion-safe:animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>

      {isDesktop && (
        <div className="h-[540px] motion-safe:animate-pulse rounded-lg border border-border bg-surface" />
      )}
    </div>
  )
}
