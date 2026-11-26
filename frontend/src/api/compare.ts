import { useQuery } from '@tanstack/react-query'
import { scenarioToParams } from '../lib/scenario'
import type { Scenario } from '../lib/scenario'
import { getJson } from './client'
import type { CompareResponse, ProgressionResponse } from './types'

function compareScenarioParams(scenario: Scenario): URLSearchParams {
  const params = scenarioToParams(scenario)
  params.delete('system')
  return params
}

export function fetchCompare(
  year: number,
  scenario: Scenario,
  signal?: AbortSignal,
): Promise<CompareResponse> {
  const qs = compareScenarioParams(scenario).toString()
  const url = qs
    ? `/api/v1/seasons/${year}/compare?${qs}`
    : `/api/v1/seasons/${year}/compare`
  return getJson<CompareResponse>(url, signal)
}

export function fetchProgression(
  year: number,
  scenario: Scenario,
  signal?: AbortSignal,
): Promise<ProgressionResponse> {
  const params = scenarioToParams(scenario)
  return getJson<ProgressionResponse>(
    `/api/v1/seasons/${year}/progression?${params.toString()}`,
    signal,
  )
}

export function useCompare(year: number | null, scenario: Scenario) {
  const canonicalParams = compareScenarioParams(scenario).toString()

  return useQuery({
    queryKey: ['compare', year, canonicalParams] as const,
    queryFn: ({ signal }) => fetchCompare(year as number, scenario, signal),
    enabled: year !== null,
    staleTime: Infinity,
    placeholderData: (previousData) =>
      previousData && previousData.season === year ? previousData : undefined,
  })
}

export function useProgression(year: number | null, scenario: Scenario) {
  const canonicalParams = scenarioToParams(scenario).toString()

  return useQuery({
    queryKey: ['progression', year, canonicalParams] as const,
    queryFn: ({ signal }) => fetchProgression(year as number, scenario, signal),
    enabled: year !== null,
    staleTime: Infinity,
    placeholderData: (previousData) =>
      previousData && previousData.season === year ? previousData : undefined,
  })
}
