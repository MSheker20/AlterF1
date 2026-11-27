// Context and hook live apart from SeasonLayout.tsx so that file exports only components
// (Vite fast refresh).
import { createContext, useContext } from 'react'
import type { ChampionshipMode, SystemId } from '../../api/types'
import type { NormalizedSeasonStandings } from '../../lib/championship'
import type { Scenario } from '../../lib/scenario'

export interface SeasonLayoutContextValue {
  mode: ChampionshipMode
  year: number
  scenario: Scenario
  isDesktop: boolean
  scenarioOpen: boolean
  displayStandings: NormalizedSeasonStandings | null
  standingsIsError: boolean
  standingsError: unknown
  showStandingsPageError: boolean
  refetchStandings: () => void
  realChampionId: string | null
  updateScenario: (updater: (prev: Scenario) => Scenario) => void
  selectSystem: (nextSystem: SystemId) => void
}

export const SeasonLayoutContext = createContext<SeasonLayoutContextValue | null>(null)

export function useSeasonLayout(): SeasonLayoutContextValue {
  const ctx = useContext(SeasonLayoutContext)
  if (!ctx) {
    throw new Error('useSeasonLayout must be used inside SeasonLayout')
  }
  return ctx
}
