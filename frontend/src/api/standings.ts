import { useQuery } from '@tanstack/react-query'
import { scenarioToParams } from '../lib/scenario'
import type { Scenario } from '../lib/scenario'
import { getJson } from './client'
import type { ScoringSystem, SeasonSummary, StandingsResponse } from './types'

export function fetchSeasons(signal?: AbortSignal): Promise<SeasonSummary[]> {
  return getJson<SeasonSummary[]>('/api/v1/seasons', signal)
}

export function fetchSystems(signal?: AbortSignal): Promise<ScoringSystem[]> {
  return getJson<ScoringSystem[]>('/api/v1/systems', signal)
}

export function fetchStandings(
  year: number,
  scenario: Scenario,
  signal?: AbortSignal,
): Promise<StandingsResponse> {
  const params = scenarioToParams(scenario)
  return getJson<StandingsResponse>(
    `/api/v1/seasons/${year}/standings?${params.toString()}`,
    signal,
  )
}

export function useSeasons() {
  return useQuery({
    queryKey: ['seasons'] as const,
    queryFn: ({ signal }) => fetchSeasons(signal),
    staleTime: Infinity,
  })
}

export function useSystems() {
  return useQuery({
    queryKey: ['systems'] as const,
    queryFn: ({ signal }) => fetchSystems(signal),
    staleTime: Infinity,
  })
}

export function useStandings(year: number | null, scenario: Scenario) {
  const canonicalParams = scenarioToParams(scenario).toString()

  return useQuery({
    queryKey: ['standings', year, canonicalParams] as const,
    queryFn: ({ signal }) => fetchStandings(year as number, scenario, signal),
    enabled: year !== null,
    staleTime: Infinity,
    placeholderData: (previousData) =>
      previousData && previousData.season === year ? previousData : undefined,
  })
}
