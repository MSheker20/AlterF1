export type SystemId = '1950' | '1961' | '1991' | '2003' | '2010'

export interface SeasonChampionSummary {
  driverId: string
  driverName: string
}

export interface SeasonSummary {
  year: number
  champion: SeasonChampionSummary | null
}

export interface ScoringSystem {
  id: SystemId
  firstSeason: number
  lastSeason: number | null
  racePoints: number[]
}

export interface RaceSummary {
  round: number
  grandPrixId: string
  code: string
  date: string
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
  races: RaceSummary[]
  champion: ChampionSummary | null
  realChampion: ChampionSummary | null
  championChanged: boolean
  standings: StandingRow[]
}

export interface ProblemDetail {
  title?: string
  status?: number
  detail?: string
}
