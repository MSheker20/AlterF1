import type { ProgressionDriver, ProgressionResponse } from '../api/types'
import { teamColor } from './teamColors'

export const DEFAULT_VISIBLE_LIMIT = 5

export interface ProgressionChartRow {
  race: string
  round: number
  [driverId: string]: string | number
}

export interface DriverLineStyle {
  color: string
  dashArray: string | undefined
}

export function toChartRows(response: ProgressionResponse): ProgressionChartRow[] {
  return response.races.map((race, raceIndex) => {
    const row: ProgressionChartRow = {
      race: race.code,
      round: race.round,
    }

    for (const driver of response.drivers) {
      const value = driver.points[raceIndex]
      if (value !== undefined) {
        row[driver.driverId] = value
      }
    }

    return row
  })
}

export function defaultVisible(
  response: ProgressionResponse,
  realChampionId?: string | null,
): string[] {
  const top = response.drivers.slice(0, DEFAULT_VISIBLE_LIMIT).map((driver) => driver.driverId)
  if (
    realChampionId &&
    !top.includes(realChampionId) &&
    response.drivers.some((driver) => driver.driverId === realChampionId)
  ) {
    return [...top, realChampionId]
  }
  return top
}

export function computeLineStyles(
  drivers: readonly ProgressionDriver[],
  visibleIds: ReadonlySet<string>,
): Map<string, DriverLineStyle> {
  const teamCounts = new Map<string, number>()
  const styles = new Map<string, DriverLineStyle>()

  for (const driver of drivers) {
    const color = teamColor(driver.constructorId)
    if (!visibleIds.has(driver.driverId)) {
      styles.set(driver.driverId, { color, dashArray: undefined })
      continue
    }

    const teamKey = driver.constructorId.trim().toLowerCase()
    const seen = teamCounts.get(teamKey) ?? 0
    teamCounts.set(teamKey, seen + 1)
    const dashArray = seen === 0 ? undefined : seen === 1 ? '6 4' : '2 3'
    styles.set(driver.driverId, { color, dashArray })
  }

  return styles
}
