import { useQuery } from '@tanstack/react-query'
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
  system: string,
  signal?: AbortSignal,
): Promise<StandingsResponse> {
  const params = new URLSearchParams({
    system,
    preset: 'historical',
  })
  return getJson<StandingsResponse>(`/api/v1/seasons/${year}/standings?${params.toString()}`, signal)
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

export function useStandings(year: number | null, system: string) {
  return useQuery({
    queryKey: ['standings', year, system] as const,
    queryFn: ({ signal }) => fetchStandings(year as number, system, signal),
    enabled: year !== null,
    staleTime: Infinity,
    placeholderData: (previousData) =>
      previousData && previousData.season === year ? previousData : undefined,
  })
}
