import { useState } from 'react'
import { ApiError } from '../api/client'
import { useCompare } from '../api/compare'
import type { CompareResponse } from '../api/types'
import { CompareMatrix } from '../components/compare/CompareMatrix'
import { QueryErrorState, StandingsErrorBanner } from '../components/season/ErrorPanel'
import { useSeasonLayout } from '../components/season/seasonLayoutContext'

const SKELETON_ROW_KEYS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export function CompareTab() {
  const {
    year,
    scenario,
    scenarioOpen,
    standingsIsError,
    standingsError,
    showStandingsPageError,
    refetchStandings,
    selectSystem,
  } = useSeasonLayout()
  const compareQuery = useCompare(year, scenario)

  const [lastCompare, setLastCompare] = useState<CompareResponse | null>(null)
  if (
    compareQuery.data &&
    compareQuery.data.season === year &&
    compareQuery.data !== lastCompare
  ) {
    setLastCompare(compareQuery.data)
  } else if (lastCompare !== null && lastCompare.season !== year) {
    setLastCompare(null)
  }

  const tabError = compareQuery.error
  const isSamePanel400 =
    scenarioOpen &&
    compareQuery.isError &&
    tabError instanceof ApiError &&
    tabError.status === 400 &&
    standingsIsError &&
    standingsError instanceof ApiError &&
    standingsError.status === 400 &&
    standingsError.field === tabError.field &&
    standingsError.detail === tabError.detail

  const handledInPanel = isSamePanel400 && lastCompare !== null
  const showPageError = compareQuery.isError && !handledInPanel
  const showStandingsBanner = !showPageError && showStandingsPageError
  const displayCompare = compareQuery.isError
    ? handledInPanel
      ? lastCompare
      : null
    : (compareQuery.data ?? null)

  function handleRetry() {
    void compareQuery.refetch()
    if (standingsIsError) {
      refetchStandings()
    }
  }

  return (
    <>
      {showPageError && <QueryErrorState error={compareQuery.error} onRetry={handleRetry} />}

      {showStandingsBanner && (
        <StandingsErrorBanner error={standingsError} onRetry={refetchStandings} />
      )}

      {!displayCompare ? (
        compareQuery.isError ? null : (
          <CompareSkeleton />
        )
      ) : (
        <CompareMatrix
          key={displayCompare.season}
          data={displayCompare}
          selectedSystem={scenario.system}
          onSelectSystem={selectSystem}
        />
      )}
    </>
  )
}

function CompareSkeleton() {
  return (
    <div aria-busy="true" className="space-y-2.5">
      <div className="h-3.5 w-56 rounded bg-surface motion-safe:animate-pulse" />
      <div className="overflow-hidden rounded-lg border border-border bg-bg">
        <div className="h-12 border-b border-border bg-surface" />
        {SKELETON_ROW_KEYS.map((key) => (
          <div
            key={key}
            className="grid h-12 grid-cols-[180px_repeat(5,minmax(0,1fr))] items-center gap-3 border-b border-border/75 px-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-4 rounded bg-surface-2 motion-safe:animate-pulse" />
              <div className="h-6 w-1 rounded-[2px] bg-surface-2 motion-safe:animate-pulse" />
              <div className="space-y-1">
                <div className="h-3 w-10 rounded bg-surface-2 motion-safe:animate-pulse" />
                <div className="h-2.5 w-24 rounded bg-surface motion-safe:animate-pulse" />
              </div>
            </div>
            {[0, 1, 2, 3, 4].map((col) => (
              <div
                key={col}
                className="mx-auto h-6 w-10 rounded bg-surface motion-safe:animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
