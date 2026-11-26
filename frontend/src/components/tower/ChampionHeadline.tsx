import type { ChampionSummary, RulesSummary } from '../../api/types'
import { strings } from '../../i18n/strings'
import { formatPoints, getSurname } from '../../lib/format'
import { formatRulesDescription } from '../../lib/scenario'

interface ChampionHeadlineProps {
  season: number
  champion: ChampionSummary | null
  realChampion: ChampionSummary | null
  championChanged: boolean
  rules: RulesSummary
  selectedSystemId: string
  activeScenarioCount: number
}

export function ChampionHeadline({
  season,
  champion,
  realChampion,
  championChanged,
  rules,
  selectedSystemId,
  activeScenarioCount,
}: ChampionHeadlineProps) {
  const isChanged = championChanged && champion !== null && realChampion !== null

  const kicker = isChanged
    ? strings.headline.changedKicker
    : strings.headline.sameKicker(season, selectedSystemId)

  let message: string
  if (isChanged) {
    message = strings.headline.championChanges(
      getSurname(champion.driverName),
      formatPoints(champion.points),
      getSurname(realChampion.driverName),
      formatPoints(realChampion.points),
    )
  } else if (champion !== null) {
    message = strings.headline.sameChampion(
      getSurname(champion.driverName),
      formatPoints(champion.points),
    )
  } else {
    message = strings.headline.noChampion
  }

  return (
    <div className="space-y-1.5">
      <div
        aria-live="polite"
        className={`rounded-md border border-border bg-surface px-3.5 py-2.5 border-l-[3px] ${
          isChanged ? 'border-l-accent' : 'border-l-[#3a4250]'
        }`}
      >
        <span
          className={`block text-[10px] font-bold uppercase tracking-[0.08em] ${
            isChanged ? 'text-accent' : 'text-muted'
          }`}
        >
          {kicker}
        </span>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-text tabular-nums sm:text-[15px]">
          {message}
        </p>
        {activeScenarioCount > 0 && (
          <p className="mt-0.5 text-xs text-muted tabular-nums">
            {strings.headline.activeScenarioChanges(activeScenarioCount)}
          </p>
        )}
      </div>

      <p className="text-xs text-muted tabular-nums">
        {formatRulesDescription(selectedSystemId, rules)}
      </p>
    </div>
  )
}
