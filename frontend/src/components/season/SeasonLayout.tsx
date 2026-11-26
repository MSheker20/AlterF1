import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { useSeasons, useStandings, useSystems } from '../../api/standings'
import type { StandingsResponse, SystemId } from '../../api/types'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { strings } from '../../i18n/strings'
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
} from '../../lib/scenario'
import type { Scenario } from '../../lib/scenario'
import { HealthBadge } from '../HealthBadge'
import { ActiveScenarioChips } from '../scenario/ActiveScenarioChips'
import { ScenarioPanel } from '../scenario/ScenarioPanel'
import type { ScenarioInlineErrors } from '../scenario/ScenarioPanel'
import { ChampionHeadline } from '../tower/ChampionHeadline'
import { SystemPicker } from '../tower/SystemPicker'
import { YearSelect } from '../tower/YearSelect'
import { DEFAULT_SEASON_ROUTE, ErrorPanel } from './ErrorPanel'
import { SeasonLayoutContext } from './seasonLayoutContext'
import type { SeasonLayoutContextValue } from './seasonLayoutContext'


function parseYearParam(rawYear: string | undefined): number | null {
  if (!rawYear || !/^\d{4}$/.test(rawYear)) {
    return null
  }
  const year = Number.parseInt(rawYear, 10)
  return Number.isInteger(year) && year > 0 ? year : null
}

function getTabSuffix(pathname: string): '' | '/compare' | '/progression' {
  const normalized = pathname.replace(/\/+$/, '')
  if (normalized.endsWith('/compare')) {
    return '/compare'
  }
  if (normalized.endsWith('/progression')) {
    return '/progression'
  }
  return ''
}

function tabLinkClass(isActive: boolean): string {
  return `relative -mb-px inline-flex items-center border-b-2 px-3.5 py-2 text-xs font-semibold tracking-wide no-underline transition-colors sm:text-[13px] ${
    isActive
      ? 'border-accent text-text'
      : 'border-transparent text-muted hover:border-[#3a4250] hover:text-text'
  }`
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

interface SeasonLayoutProps {
  children?: ReactNode
}

export function SeasonLayout({ children }: SeasonLayoutProps) {
  const { year: rawYear } = useParams<{ year: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
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
  const { refetch: refetchStandingsQuery } = standingsQuery

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
  } else if (lastStandings !== null && lastStandings.season !== parsedYear) {
    setLastStandings(null)
  }

  // A new season closes the scenario panel (state adjusted during render, no effect).
  const [shownYear, setShownYear] = useState(parsedYear)
  if (parsedYear !== shownYear) {
    setShownYear(parsedYear)
    setScenarioOpen(false)
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

  const showStandingsPageError = standingsQuery.isError && !handledInPanel
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
        // Only rebuilt when the standings change, not on every render.
        const currentStandings = displayStandings
        updateScenario((prev) => ({
          ...prev,
          system: 'custom',
          custom:
            prev.custom ??
            (currentStandings
              ? customFromRules(currentStandings.rules)
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
    [updateScenario, displayStandings],
  )

  const handleYearChange = useCallback(
    (nextYear: number) => {
      setScenarioOpen(false)
      const rawSystem = searchParams.get('system')?.trim()
      const hasExplicitSystem = isKnownSystemId(rawSystem)
      const nextScenario = scenarioForYearChange(scenario, hasExplicitSystem, nextYear)
      const tabSuffix = getTabSuffix(location.pathname)
      navigate(`/season/${nextYear}${tabSuffix}?${scenarioToParams(nextScenario).toString()}`)
    },
    [location.pathname, navigate, scenario, searchParams],
  )

  const handleResetScenario = useCallback(() => {
    updateScenario(() => createDefaultScenario(defaultSystemForYear(parsedYear)))
  }, [parsedYear, updateScenario])

  const handleCloseScenario = useCallback(() => {
    setScenarioOpen(false)
  }, [])

  const refetchStandings = useCallback(() => {
    void refetchStandingsQuery()
  }, [refetchStandingsQuery])

  const seasons = seasonsQuery.data ?? []
  const systems = systemsQuery.data ?? []
  const realChampionId = displayStandings?.realChampion?.driverId ?? null

  const contextValue = useMemo<SeasonLayoutContextValue | null>(() => {
    if (parsedYear === null) {
      return null
    }
    return {
      year: parsedYear,
      scenario,
      isDesktop,
      scenarioOpen,
      displayStandings,
      standingsIsError: standingsQuery.isError,
      standingsError: standingsQuery.error,
      showStandingsPageError,
      refetchStandings,
      realChampionId,
      updateScenario,
      selectSystem: handleSystemChange,
    }
  }, [
    parsedYear,
    scenario,
    isDesktop,
    scenarioOpen,
    displayStandings,
    standingsQuery.isError,
    standingsQuery.error,
    showStandingsPageError,
    refetchStandings,
    realChampionId,
    updateScenario,
    handleSystemChange,
  ])

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link
            to={DEFAULT_SEASON_ROUTE}
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
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:text-[13px] ${
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
        {parsedYear === null || contextValue === null ? (
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
                  // A season without sprints should not mention a sprint table in its rules line.
                  rules={
                    displayStandings.races.some((race) => race.sprint)
                      ? displayStandings.rules
                      : { ...displayStandings.rules, sprintPoints: [] }
                  }
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

              <nav
                aria-label={strings.tabs.navAriaLabel}
                className="flex items-center gap-1 border-b border-border pt-1"
              >
                <NavLink
                  to={{ pathname: `/season/${parsedYear}`, search: location.search }}
                  end
                  className={({ isActive }) => tabLinkClass(isActive)}
                >
                  {strings.tabs.tower}
                </NavLink>
                <NavLink
                  to={{ pathname: `/season/${parsedYear}/compare`, search: location.search }}
                  end
                  className={({ isActive }) => tabLinkClass(isActive)}
                >
                  {strings.tabs.compare}
                </NavLink>
                <NavLink
                  to={{ pathname: `/season/${parsedYear}/progression`, search: location.search }}
                  end
                  className={({ isActive }) => tabLinkClass(isActive)}
                >
                  {strings.tabs.progression}
                </NavLink>
              </nav>
            </div>

            <SeasonLayoutContext.Provider value={contextValue}>
              {children ?? <Outlet />}
            </SeasonLayoutContext.Provider>

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

function HeadlineSkeleton() {
  return (
    <div aria-busy="true" className="space-y-2">
      <div className="h-[62px] rounded-md border border-border bg-surface motion-safe:animate-pulse" />
      <div className="h-3.5 w-48 rounded bg-surface motion-safe:animate-pulse" />
    </div>
  )
}
