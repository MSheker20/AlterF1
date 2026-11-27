import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { RaceSummary } from '../../api/types'

interface RacesSectionProps {
  races: readonly RaceSummary[]
  skippedRounds: readonly number[]
  onToggleRace: (round: number) => void
  error?: string | null
}

function raceChipAria(
  t: TFunction,
  round: number,
  code: string,
  isSprint: boolean,
  isSkipped: boolean,
): string {
  const parts = [t('scenario.raceChipRound', { round, code })]
  if (isSprint) {
    parts.push(t('scenario.raceChipSprint'))
  }
  if (isSkipped) {
    parts.push(t('scenario.raceChipRemoved'))
  }
  return parts.join(', ')
}

export function RacesSection({
  races,
  skippedRounds,
  onToggleRace,
  error = null,
}: RacesSectionProps) {
  const { t } = useTranslation()
  const skippedSet = useMemo(() => new Set(skippedRounds), [skippedRounds])

  const remainingCount = useMemo(() => {
    let remaining = 0
    for (const race of races) {
      if (!skippedSet.has(race.round)) {
        remaining += 1
      }
    }
    return remaining
  }, [races, skippedSet])

  const removedCount = skippedRounds.length

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 flex w-full items-center justify-between gap-2 p-0">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          {t('scenario.racesLegend')}
        </span>
        <span
          className={`text-[11px] font-semibold tabular-nums ${
            removedCount > 0 ? 'text-accent' : 'text-muted'
          }`}
        >
          {t('scenario.racesRemoved', { count: removedCount })}
        </span>
      </legend>

      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
        {races.map((race) => {
          const isSkipped = skippedSet.has(race.round)
          const isLastRemaining = !isSkipped && remainingCount <= 1

          return (
            <button
              key={race.round}
              type="button"
              disabled={isLastRemaining}
              aria-pressed={isSkipped}
              aria-label={raceChipAria(t, race.round, race.code, race.sprint, isSkipped)}
              title={
                isLastRemaining
                  ? t('scenario.cannotSkipAllRaces')
                  : `${race.round}. ${race.code} (${race.date})`
              }
              onClick={() => onToggleRace(race.round)}
              className={`relative flex min-h-[42px] cursor-pointer flex-col items-center justify-center rounded-md border px-1 py-1 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                isSkipped
                  ? 'border-err/45 bg-err/10 text-muted line-through hover:border-err/70'
                  : 'border-border bg-bg text-text hover:border-[#3a4250] hover:bg-surface-2'
              }`}
            >
              {race.sprint && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-0.5 text-[9px] font-extrabold leading-none text-gold"
                >
                  {t('scenario.racesSprintBadge')}
                </span>
              )}
              <span
                aria-hidden="true"
                className="text-[9px] font-semibold leading-none tabular-nums text-muted"
              >
                R{race.round}
              </span>
              <span
                aria-hidden="true"
                className="mt-0.5 text-[11px] font-bold uppercase leading-none tracking-[0.05em]"
              >
                {race.code}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-err">
          {error}
        </p>
      )}
    </fieldset>
  )
}
