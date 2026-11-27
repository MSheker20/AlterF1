import type {
  ChampionshipMode,
  CompareCell,
  CompareResponse,
  ConstructorCompareResponse,
  ConstructorProgressionResponse,
  ConstructorStandingRow,
  ConstructorStandingsResponse,
  EntrantSummary,
  ProgressionRace,
  ProgressionResponse,
  RaceSummary,
  RulesSummary,
  ScenarioPayload,
  SeasonNote,
  StandingRow,
  StandingsResponse,
} from '../api/types'
import { fallbackDriverCode, getSurname } from './format'

export type StandingEntry = StandingRow | ConstructorStandingRow

export function isDriverStanding(row: StandingEntry): row is StandingRow {
  return 'driverId' in row
}

export function standingEntryId(row: StandingEntry): string {
  return isDriverStanding(row) ? row.driverId : row.teamId
}

export function standingEntryName(row: StandingEntry): string {
  return isDriverStanding(row) ? row.driverName : row.teamName
}

export interface HeadlineChampion {
  id: string
  /** Short name shown in headlines (surname for drivers, full team name for constructors). */
  displayName: string
  points: number
}

export interface NormalizedSeasonStandings {
  mode: ChampionshipMode
  season: number
  system: string
  realSystem: string | null
  preset: string
  alternative: boolean
  bestCarOnly: boolean
  scenario: ScenarioPayload
  rules: RulesSummary
  races: RaceSummary[]
  entrants: EntrantSummary[]
  champion: HeadlineChampion | null
  realChampion: HeadlineChampion | null
  championChanged: boolean
  notes: SeasonNote[]
  standings: StandingEntry[]
}

export function normalizeDriverStandings(data: StandingsResponse): NormalizedSeasonStandings {
  return {
    mode: 'drivers',
    season: data.season,
    system: data.system,
    realSystem: data.realSystem,
    preset: data.preset,
    alternative: false,
    bestCarOnly: false,
    scenario: data.scenario,
    rules: data.rules,
    races: data.races,
    entrants: data.entrants,
    champion: data.champion
      ? {
          id: data.champion.driverId,
          displayName: getSurname(data.champion.driverName),
          points: data.champion.points,
        }
      : null,
    realChampion: data.realChampion
      ? {
          id: data.realChampion.driverId,
          displayName: getSurname(data.realChampion.driverName),
          points: data.realChampion.points,
        }
      : null,
    championChanged: data.championChanged,
    notes: data.notes,
    standings: data.standings,
  }
}

export function normalizeConstructorStandings(
  data: ConstructorStandingsResponse,
): NormalizedSeasonStandings {
  return {
    mode: 'constructors',
    season: data.season,
    system: data.system,
    realSystem: data.realSystem,
    preset: data.preset,
    alternative: data.alternative,
    bestCarOnly: data.constructorRules.bestCarOnly,
    scenario: data.scenario,
    rules: data.rules,
    races: data.races,
    entrants: data.entrants,
    champion: data.champion
      ? {
          id: data.champion.teamId,
          displayName: data.champion.teamName,
          points: data.champion.points,
        }
      : null,
    realChampion: data.realChampion
      ? {
          id: data.realChampion.teamId,
          displayName: data.realChampion.teamName,
          points: data.realChampion.points,
        }
      : null,
    championChanged: data.championChanged,
    notes: data.notes,
    standings: data.standings,
  }
}

export interface NormalizedCompareSystem {
  id: string
  championId: string | null
  championBadge: string | null
  championLabel: string | null
  championChanged: boolean
}

export interface NormalizedCompareRow {
  id: string
  name: string
  code: string | null
  constructorId: string
  realPosition: number | null
  cells: Partial<Record<string, CompareCell>>
}

export interface NormalizedCompareData {
  mode: ChampionshipMode
  season: number
  realSystem: string | null
  alternative: boolean
  systems: NormalizedCompareSystem[]
  rows: NormalizedCompareRow[]
}

export function normalizeDriverCompare(data: CompareResponse): NormalizedCompareData {
  const codeById = new Map<string, string>()
  for (const driver of data.drivers) {
    codeById.set(driver.driverId, fallbackDriverCode(driver.driverCode, driver.driverName))
  }

  return {
    mode: 'drivers',
    season: data.season,
    realSystem: data.realSystem,
    alternative: false,
    systems: data.systems.map((sys) => ({
      id: sys.id,
      championId: sys.champion?.driverId ?? null,
      championBadge: sys.champion
        ? (codeById.get(sys.champion.driverId) ?? fallbackDriverCode('', sys.champion.driverName))
        : null,
      championLabel: sys.champion ? getSurname(sys.champion.driverName) : null,
      championChanged: sys.championChanged,
    })),
    rows: data.drivers.map((driver) => ({
      id: driver.driverId,
      name: driver.driverName,
      code: fallbackDriverCode(driver.driverCode, driver.driverName),
      constructorId: driver.constructorId,
      realPosition: driver.realPosition,
      cells: driver.cells,
    })),
  }
}

export function normalizeConstructorCompare(
  data: ConstructorCompareResponse,
): NormalizedCompareData {
  return {
    mode: 'constructors',
    season: data.season,
    realSystem: data.realSystem,
    alternative: data.alternative,
    systems: data.systems.map((sys) => ({
      id: sys.id,
      championId: sys.champion?.teamId ?? null,
      championBadge: sys.champion?.teamName ?? null,
      championLabel: sys.champion?.teamName ?? null,
      championChanged: sys.championChanged,
    })),
    rows: data.teams.map((team) => ({
      id: team.teamId,
      name: team.teamName,
      code: null,
      constructorId: team.constructorId,
      realPosition: team.realPosition,
      cells: team.cells,
    })),
  }
}

export interface NormalizedProgressionEntry {
  id: string
  name: string
  /** 3-letter uppercase code for drivers; null for constructors (displays full teamName). */
  code: string | null
  shortName: string
  constructorId: string
  position: number
  points: number[]
}

export interface NormalizedProgressionClinch {
  round: number
  code: string
  entryId: string
}

export interface NormalizedProgressionData {
  mode: ChampionshipMode
  season: number
  system: string
  alternative: boolean
  races: ProgressionRace[]
  entries: NormalizedProgressionEntry[]
  clinch: NormalizedProgressionClinch | null
}

export function normalizeDriverProgression(
  data: ProgressionResponse,
): NormalizedProgressionData {
  return {
    mode: 'drivers',
    season: data.season,
    system: data.system,
    alternative: false,
    races: data.races,
    entries: data.drivers.map((driver) => ({
      id: driver.driverId,
      name: driver.driverName,
      code: fallbackDriverCode(driver.driverCode, driver.driverName),
      shortName: getSurname(driver.driverName),
      constructorId: driver.constructorId,
      position: driver.position,
      points: driver.points,
    })),
    clinch: data.clinch
      ? {
          round: data.clinch.round,
          code: data.clinch.code,
          entryId: data.clinch.driverId,
        }
      : null,
  }
}

export function normalizeConstructorProgression(
  data: ConstructorProgressionResponse,
): NormalizedProgressionData {
  return {
    mode: 'constructors',
    season: data.season,
    system: data.system,
    alternative: data.alternative,
    races: data.races,
    entries: data.teams.map((team) => ({
      id: team.teamId,
      name: team.teamName,
      code: null,
      shortName: team.teamName,
      constructorId: team.constructorId,
      position: team.position,
      points: team.points,
    })),
    clinch: data.clinch
      ? {
          round: data.clinch.round,
          code: data.clinch.code,
          entryId: data.clinch.teamId,
        }
      : null,
  }
}
