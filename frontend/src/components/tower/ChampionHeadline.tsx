import { useTranslation } from 'react-i18next'
import type { ChampionSummary, RulesSummary } from '../../api/types'
import { systemContext, systemLabel } from '../../i18n/system'
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
  const { t } = useTranslation()
  const isChanged = championChanged && champion !== null && realChampion !== null

  const kicker = isChanged
    ? t('headline.changedKicker')
    : t('headline.sameKicker', {
        season,
        system: systemLabel(t, selectedSystemId),
        context: systemContext(selectedSystemId),
      })

  let message: string
  if (isChanged) {
    message = t('headline.championChanges', {
      champion: getSurname(champion.driverName),
      championPoints: formatPoints(champion.points),
      realChampion: getSurname(realChampion.driverName),
      realChampionPoints: formatPoints(realChampion.points),
    })
  } else if (champion !== null) {
    message = t('headline.sameChampion', {
      champion: getSurname(champion.driverName),
      points: formatPoints(champion.points),
    })
  } else {
    message = t('headline.noChampion')
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
            isChanged ? 'text-accent-text' : 'text-muted'
          }`}
        >
          {kicker}
        </span>
        <p className="mt-0.5 text-sm font-semibold leading-snug text-text tabular-nums sm:text-[15px]">
          {message}
        </p>
        {activeScenarioCount > 0 && (
          <p className="mt-0.5 text-xs text-muted tabular-nums">
            {t('headline.activeScenarioChanges', { count: activeScenarioCount })}
          </p>
        )}
      </div>

      <p className="text-xs text-muted tabular-nums">
        {formatRulesDescription(t, selectedSystemId, rules)}
      </p>
    </div>
  )
}
