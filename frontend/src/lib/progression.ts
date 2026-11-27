import type { ProgressionDriver, ProgressionRace, ProgressionResponse } from '../api/types'
import { teamColor } from './teamColors'

export const DEFAULT_VISIBLE_LIMIT = 5

export interface ProgressionChartRow {
  race: string
  round: number
  [entryId: string]: string | number
}

export interface DriverLineStyle {
  color: string
  dashArray: string | undefined
}

export interface ProgressionSeriesEntry {
  id: string
  constructorId: string
  points: readonly number[]
}

export function buildChartRows(
  races: readonly ProgressionRace[],
  entries: readonly ProgressionSeriesEntry[],
): ProgressionChartRow[] {
  return races.map((race, raceIndex) => {
    const row: ProgressionChartRow = {
      race: race.code,
      round: race.round,
    }

    for (const entry of entries) {
      const value = entry.points[raceIndex]
      if (value !== undefined) {
        row[entry.id] = value
      }
    }

    return row
  })
}

export function defaultVisibleEntries(
  entries: readonly { id: string }[],
  realChampionId?: string | null,
): string[] {
  const top = entries.slice(0, DEFAULT_VISIBLE_LIMIT).map((entry) => entry.id)
  if (
    realChampionId &&
    !top.includes(realChampionId) &&
    entries.some((entry) => entry.id === realChampionId)
  ) {
    return [...top, realChampionId]
  }
  return top
}

export function computeEntryLineStyles(
  entries: readonly { id: string; constructorId: string }[],
  visibleIds: ReadonlySet<string>,
): Map<string, DriverLineStyle> {
  const teamCounts = new Map<string, number>()
  const styles = new Map<string, DriverLineStyle>()

  for (const entry of entries) {
    const color = teamColor(entry.constructorId)
    if (!visibleIds.has(entry.id)) {
      styles.set(entry.id, { color, dashArray: undefined })
      continue
    }

    const teamKey = entry.constructorId.trim().toLowerCase()
    const seen = teamCounts.get(teamKey) ?? 0
    teamCounts.set(teamKey, seen + 1)
    const dashArray = seen === 0 ? undefined : seen === 1 ? '6 4' : '2 3'
    styles.set(entry.id, { color, dashArray })
  }

  return styles
}

export function toChartRows(response: ProgressionResponse): ProgressionChartRow[] {
  return buildChartRows(
    response.races,
    response.drivers.map((driver) => ({
      id: driver.driverId,
      constructorId: driver.constructorId,
      points: driver.points,
    })),
  )
}

export function defaultVisible(
  response: ProgressionResponse,
  realChampionId?: string | null,
): string[] {
  return defaultVisibleEntries(
    response.drivers.map((driver) => ({ id: driver.driverId })),
    realChampionId,
  )
}

export function computeLineStyles(
  drivers: readonly ProgressionDriver[],
  visibleIds: ReadonlySet<string>,
): Map<string, DriverLineStyle> {
  return computeEntryLineStyles(
    drivers.map((driver) => ({
      id: driver.driverId,
      constructorId: driver.constructorId,
    })),
    visibleIds,
  )
}
