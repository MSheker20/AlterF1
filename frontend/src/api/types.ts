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
  /** Why points may look unusual this season (PLAN.md §7); empty when nothing applies. */
  notes: SeasonNote[]
  standings: StandingRow[]
}

export type SeasonNote =
  | 'half-points'
  | 'double-points'
  | 'shared-points'
  | 'sprint-assumed'
  | 'best-scaled'
  | 'ineligible'

export interface HighlightAlternative {
  system: string
  champion: ChampionSummary
  championConstructorId: string
  /** Where the real champion finishes under this system. */
  realChampionPosition: number
  realChampionPoints: number
}

/** A season whose champion changes under another points system (home page card). */
export interface Highlight {
  season: number
  realSystem: string
  realChampion: ChampionSummary
  realChampionConstructorId: string | null
  alternatives: HighlightAlternative[]
}

export interface CompareSystemSummary {
  id: string
  champion: ChampionSummary | null
  championChanged: boolean
}

export interface CompareCell {
  position: number
  points: number
}

export interface CompareDriverRow {
  driverId: string
  driverName: string
  driverCode: string
  constructorId: string
  constructorName: string
  realPosition: number | null
  cells: Partial<Record<string, CompareCell>>
}

export interface CompareResponse {
  season: number
  realSystem: string | null
  systems: CompareSystemSummary[]
  drivers: CompareDriverRow[]
}

export interface ProgressionRace {
  round: number
  code: string
  sprint: boolean
}

export interface ProgressionDriver {
  driverId: string
  driverName: string
  driverCode: string
  constructorId: string
  position: number
  points: number[]
}

export interface ClinchInfo {
  round: number
  code: string
  driverId: string
}

export interface ProgressionResponse {
  season: number
  system: string
  races: ProgressionRace[]
  drivers: ProgressionDriver[]
  clinch: ClinchInfo | null
}

export interface ProblemDetail {
  title?: string
  status?: number
  detail?: string
  field?: string
}
