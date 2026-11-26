export type BuiltinSystemId = '1950' | '1961' | '1991' | '2003' | '2010'
export type SystemId = BuiltinSystemId | 'custom'
export type MultiplierPreset = 'historical' | 'pure' | 'all'
export type CustomSprintMode = 'none' | '321' | '8'

export interface SeasonChampionSummary {
  driverId: string
  driverName: string
}

export interface SeasonSummary {
  year: number
  champion: SeasonChampionSummary | null
}

export interface ScoringSystem {
  id: BuiltinSystemId
  firstSeason: number
  lastSeason: number | null
  racePoints: number[]
}

export interface CustomSystemConfig {
  racePoints: number[]
  fastestLap: boolean
  sprint: CustomSprintMode
  bestResults: number | null
}

export interface ScenarioPayload {
  excludedDrivers: string[]
  skippedRounds: number[]
  sprints: boolean
  fastestLap: boolean
  preset: MultiplierPreset
  custom: CustomSystemConfig | null
}

export interface FastestLapRule {
  points: number
  maxPosition: number | null
}

export type BestResultsRule =
  | { type: 'all' }
  | { type: 'season'; count: number }
  | { type: 'halves'; firstHalfRaces: number; firstCount: number; secondCount: number }

export interface RulesSummary {
  racePoints: number[]
  sprintPoints: number[]
  fastestLap: FastestLapRule | null
  bestResults: BestResultsRule
}

export interface RaceSummary {
  round: number
  grandPrixId: string
  code: string
  date: string
  sprint: boolean
  skipped: boolean
}

export interface EntrantSummary {
  driverId: string
  driverName: string
  driverCode: string
  constructorId: string
  constructorName: string
  excluded: boolean
}

export interface ChampionSummary {
  driverId: string
  driverName: string
  points: number
}

export interface StandingRow {
  position: number
  realPosition: number | null
  positionChange: number | null
  driverId: string
  driverName: string
  driverCode: string
  constructorId: string
  constructorName: string
  points: number
  realPoints: number | null
  wins: number
  podiums: number
  results: string[]
}

export interface StandingsResponse {
  season: number
  system: string
  realSystem: string | null
  preset: string
  scenario: ScenarioPayload
  rules: RulesSummary
  races: RaceSummary[]
  entrants: EntrantSummary[]
  champion: ChampionSummary | null
  realChampion: ChampionSummary | null
  championChanged: boolean
  standings: StandingRow[]
}

export interface ProblemDetail {
  title?: string
  status?: number
  detail?: string
  field?: string
}
