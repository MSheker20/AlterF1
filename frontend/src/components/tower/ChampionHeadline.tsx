import { useTranslation } from 'react-i18next'
import type { RulesSummary } from '../../api/types'
import { systemContext, systemLabel } from '../../i18n/system'
import type { HeadlineChampion } from '../../lib/championship'
import { formatPoints } from '../../lib/format'
import { formatRulesDescription } from '../../lib/scenario'

interface ChampionHeadlineProps {
  season: number
  champion: HeadlineChampion | null
  realChampion: HeadlineChampion | null
  championChanged: boolean
  rules: RulesSummary
  selectedSystemId: string
  activeScenarioCount: number
  alternative?: boolean
  bestCarOnly?: boolean
}

export function ChampionHeadline({
  season,
  champion,
  realChampion,
  championChanged,
  rules,
  selectedSystemId,
  activeScenarioCount,
  alternative = false,
  bestCarOnly = false,
}: ChampionHeadlineProps) {
  const { t } = useTranslation()
  const isChanged = !alternative && championChanged && champion !== null && realChampion !== null

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
      champion: champion.displayName,
      championPoints: formatPoints(champion.points),
      realChampion: realChampion.displayName,
      realChampionPoints: formatPoints(realChampion.points),
    })
  } else if (alternative && champion !== null) {
    message = t('headline.alternativeChampion', {
      champion: champion.displayName,
      points: formatPoints(champion.points),
    })
  } else if (champion !== null) {
    message = t('headline.sameChampion', {
      champion: champion.displayName,
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
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span
            className={`block text-[10px] font-bold uppercase tracking-[0.08em] ${
              isChanged ? 'text-accent-text' : 'text-muted'
            }`}
          >
            {kicker}
          </span>
          {alternative && (
            <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-text">
              {t('headline.alternativeBadge')}
            </span>
          )}
        </div>
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
        {formatRulesDescription(t, selectedSystemId, rules, { bestCarOnly })}
      </p>
    </div>
  )
}
