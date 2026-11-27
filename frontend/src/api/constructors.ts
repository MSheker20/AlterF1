import { useQuery } from '@tanstack/react-query'
import { scenarioToParams } from '../lib/scenario'
import type { Scenario } from '../lib/scenario'
import { getJson } from './client'
import type {
  ConstructorCompareResponse,
  ConstructorProgressionResponse,
  ConstructorStandingsResponse,
} from './types'

function compareScenarioParams(scenario: Scenario): URLSearchParams {
  const params = scenarioToParams(scenario)
  params.delete('system')
  return params
}

export function fetchConstructorStandings(
  year: number,
  scenario: Scenario,
  signal?: AbortSignal,
): Promise<ConstructorStandingsResponse> {
  const params = scenarioToParams(scenario)
  return getJson<ConstructorStandingsResponse>(
    `/api/v1/seasons/${year}/constructors?${params.toString()}`,
    signal,
  )
}

export function fetchConstructorCompare(
  year: number,
  scenario: Scenario,
  signal?: AbortSignal,
): Promise<ConstructorCompareResponse> {
  const qs = compareScenarioParams(scenario).toString()
  const url = qs
    ? `/api/v1/seasons/${year}/constructors/compare?${qs}`
    : `/api/v1/seasons/${year}/constructors/compare`
  return getJson<ConstructorCompareResponse>(url, signal)
}

export function fetchConstructorProgression(
  year: number,
  scenario: Scenario,
  signal?: AbortSignal,
): Promise<ConstructorProgressionResponse> {
  const params = scenarioToParams(scenario)
  return getJson<ConstructorProgressionResponse>(
    `/api/v1/seasons/${year}/constructors/progression?${params.toString()}`,
    signal,
  )
}

export function useConstructorStandings(year: number | null, scenario: Scenario) {
  const canonicalParams = scenarioToParams(scenario).toString()

  return useQuery({
    queryKey: ['constructors-standings', year, canonicalParams] as const,
    queryFn: ({ signal }) => fetchConstructorStandings(year as number, scenario, signal),
    enabled: year !== null,
    staleTime: Infinity,
    placeholderData: (previousData) =>
      previousData && previousData.season === year ? previousData : undefined,
  })
}

export function useConstructorCompare(year: number | null, scenario: Scenario) {
  const canonicalParams = compareScenarioParams(scenario).toString()

  return useQuery({
    queryKey: ['constructors-compare', year, canonicalParams] as const,
    queryFn: ({ signal }) => fetchConstructorCompare(year as number, scenario, signal),
    enabled: year !== null,
    staleTime: Infinity,
    placeholderData: (previousData) =>
      previousData && previousData.season === year ? previousData : undefined,
  })
}

export function useConstructorProgression(year: number | null, scenario: Scenario) {
  const canonicalParams = scenarioToParams(scenario).toString()

  return useQuery({
    queryKey: ['constructors-progression', year, canonicalParams] as const,
    queryFn: ({ signal }) => fetchConstructorProgression(year as number, scenario, signal),
    enabled: year !== null,
    staleTime: Infinity,
    placeholderData: (previousData) =>
      previousData && previousData.season === year ? previousData : undefined,
  })
}
