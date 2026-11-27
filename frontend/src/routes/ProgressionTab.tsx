import { useMemo, useState } from 'react'
import { ApiError } from '../api/client'
import { useProgression } from '../api/compare'
import { useConstructorProgression } from '../api/constructors'
import { ProgressionChart } from '../components/progression/ProgressionChart'
import { QueryErrorState, StandingsErrorBanner } from '../components/season/ErrorPanel'
import { useSeasonLayout } from '../components/season/seasonLayoutContext'
import {
  normalizeConstructorProgression,
  normalizeDriverProgression,
} from '../lib/championship'
import type { NormalizedProgressionData } from '../lib/championship'
import { scenarioToParams } from '../lib/scenario'

export function ProgressionTab() {
  const {
    mode,
    year,
    scenario,
    isDesktop,
    scenarioOpen,
    standingsIsError,
    standingsError,
    showStandingsPageError,
    refetchStandings,
    realChampionId,
  } = useSeasonLayout()

  const driverProgressionQuery = useProgression(mode === 'drivers' ? year : null, scenario)
  const constructorProgressionQuery = useConstructorProgression(
    mode === 'constructors' ? year : null,
    scenario,
  )
  const activeQuery =
    mode === 'constructors' ? constructorProgressionQuery : driverProgressionQuery
  const scenarioKey = scenarioToParams(scenario).toString()

  const normalizedData = useMemo<NormalizedProgressionData | null>(() => {
    if (mode === 'constructors') {
      return constructorProgressionQuery.data
        ? normalizeConstructorProgression(constructorProgressionQuery.data)
        : null
    }
    return driverProgressionQuery.data
      ? normalizeDriverProgression(driverProgressionQuery.data)
      : null
  }, [mode, constructorProgressionQuery.data, driverProgressionQuery.data])

  const [lastProgression, setLastProgression] = useState<NormalizedProgressionData | null>(null)
  if (
    normalizedData &&
    normalizedData.season === year &&
    normalizedData.mode === mode &&
    normalizedData !== lastProgression
  ) {
    setLastProgression(normalizedData)
  } else if (
    lastProgression !== null &&
    (lastProgression.season !== year || lastProgression.mode !== mode)
  ) {
    setLastProgression(null)
  }

  const tabError = activeQuery.error
  const isSamePanel400 =
    scenarioOpen &&
    activeQuery.isError &&
    tabError instanceof ApiError &&
    tabError.status === 400 &&
    standingsIsError &&
    standingsError instanceof ApiError &&
    standingsError.status === 400 &&
    standingsError.field === tabError.field &&
    standingsError.detail === tabError.detail

  const handledInPanel = isSamePanel400 && lastProgression !== null
  const showPageError = activeQuery.isError && !handledInPanel
  const showStandingsBanner = !showPageError && showStandingsPageError
  const displayProgression = activeQuery.isError
    ? handledInPanel
      ? lastProgression
      : null
    : normalizedData

  function handleRetry() {
    void activeQuery.refetch()
    if (standingsIsError) {
      refetchStandings()
    }
  }

  return (
    <>
      {showPageError && <QueryErrorState error={activeQuery.error} onRetry={handleRetry} />}

      {showStandingsBanner && (
        <StandingsErrorBanner error={standingsError} onRetry={refetchStandings} />
      )}

      {!displayProgression ? (
        activeQuery.isError ? null : (
          <ProgressionSkeleton />
        )
      ) : (
        <ProgressionChart
          data={displayProgression}
          realChampionId={realChampionId}
          isDesktop={isDesktop}
          scenarioKey={scenarioKey}
        />
      )}
    </>
  )
}

function ProgressionSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <div className="h-4 w-72 rounded bg-surface motion-safe:animate-pulse" />
      <div className="h-[360px] rounded-lg border border-border bg-surface motion-safe:animate-pulse lg:h-[440px]" />
      <div className="h-24 rounded-lg border border-border bg-surface motion-safe:animate-pulse" />
    </div>
  )
}
