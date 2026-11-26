import { useState } from 'react'
import { ApiError } from '../api/client'
import { useProgression } from '../api/compare'
import type { ProgressionResponse } from '../api/types'
import { ProgressionChart } from '../components/progression/ProgressionChart'
import { QueryErrorState, StandingsErrorBanner } from '../components/season/ErrorPanel'
import { useSeasonLayout } from '../components/season/seasonLayoutContext'
import { scenarioToParams } from '../lib/scenario'

export function ProgressionTab() {
  const {
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
  const progressionQuery = useProgression(year, scenario)
  const scenarioKey = scenarioToParams(scenario).toString()

  const [lastProgression, setLastProgression] = useState<ProgressionResponse | null>(null)
  if (
    progressionQuery.data &&
    progressionQuery.data.season === year &&
    progressionQuery.data !== lastProgression
  ) {
    setLastProgression(progressionQuery.data)
  } else if (lastProgression !== null && lastProgression.season !== year) {
    setLastProgression(null)
  }

  const tabError = progressionQuery.error
  const isSamePanel400 =
    scenarioOpen &&
    progressionQuery.isError &&
    tabError instanceof ApiError &&
    tabError.status === 400 &&
    standingsIsError &&
    standingsError instanceof ApiError &&
    standingsError.status === 400 &&
    standingsError.field === tabError.field &&
    standingsError.detail === tabError.detail

  const handledInPanel = isSamePanel400 && lastProgression !== null
  const showPageError = progressionQuery.isError && !handledInPanel
  const showStandingsBanner = !showPageError && showStandingsPageError
  const displayProgression = progressionQuery.isError
    ? handledInPanel
      ? lastProgression
      : null
    : (progressionQuery.data ?? null)

  function handleRetry() {
    void progressionQuery.refetch()
    if (standingsIsError) {
      refetchStandings()
    }
  }

  return (
    <>
      {showPageError && <QueryErrorState error={progressionQuery.error} onRetry={handleRetry} />}

      {showStandingsBanner && (
        <StandingsErrorBanner error={standingsError} onRetry={refetchStandings} />
      )}

      {!displayProgression ? (
        progressionQuery.isError ? null : (
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
