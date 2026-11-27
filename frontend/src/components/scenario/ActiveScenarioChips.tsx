import { useTranslation } from 'react-i18next'
import type { EntrantSummary, RaceSummary } from '../../api/types'
import { fallbackDriverCode, formatPoints } from '../../lib/format'
import { defaultSystemForYear } from '../../lib/scenario'
import type { Scenario } from '../../lib/scenario'

interface ActiveScenarioChipsProps {
  scenario: Scenario
  entrants: readonly EntrantSummary[]
  races: readonly RaceSummary[]
  season: number
  onChangeScenario: (updater: (prev: Scenario) => Scenario) => void
}

interface ScenarioChip {
  key: string
  label: string
  onRemove: () => void
}

function driverCodeFallbackFromId(driverId: string): string {
  const parts = driverId.split('-').filter((part) => part.length > 0)
  const last = parts[parts.length - 1] ?? driverId
  return last.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || driverId.toUpperCase()
}

function formatCustomPreview(racePoints: readonly number[]): string {
  if (racePoints.length <= 3) {
    return racePoints.map(formatPoints).join('-')
  }
  return `${racePoints.slice(0, 3).map(formatPoints).join('-')}…`
}

export function ActiveScenarioChips({
  scenario,
  entrants,
  races,
  season,
  onChangeScenario,
}: ActiveScenarioChipsProps) {
  const { t } = useTranslation()
  const chips: ScenarioChip[] = []

  const entrantById = new Map<string, EntrantSummary>()
  for (const entrant of entrants) {
    entrantById.set(entrant.driverId, entrant)
  }

  for (const driverId of scenario.exclude) {
    const entrant = entrantById.get(driverId)
    const code = entrant
      ? fallbackDriverCode(entrant.driverCode, entrant.driverName)
      : driverCodeFallbackFromId(driverId)

    chips.push({
      key: `exclude:${driverId}`,
      label: t('scenario.chipWithoutDriver', { code }),
      onRemove: () =>
        onChangeScenario((prev) => ({
          ...prev,
          exclude: prev.exclude.filter((id) => id !== driverId),
        })),
    })
  }

  const raceByRound = new Map<number, RaceSummary>()
  for (const race of races) {
    raceByRound.set(race.round, race)
  }

  for (const round of scenario.skip) {
    const race = raceByRound.get(round)
    const code = race ? race.code : `R${round}`

    chips.push({
      key: `skip:${round}`,
      label: t('scenario.chipNoRace', { code }),
      onRemove: () =>
        onChangeScenario((prev) => ({
          ...prev,
          skip: prev.skip.filter((r) => r !== round),
        })),
    })
  }

  if (!scenario.sprint) {
    chips.push({
      key: 'sprint:off',
      label: t('scenario.chipSprintsOff'),
      onRemove: () => onChangeScenario((prev) => ({ ...prev, sprint: true })),
    })
  }

  if (!scenario.fl) {
    chips.push({
      key: 'fl:off',
      label: t('scenario.chipNoFastestLap'),
      onRemove: () => onChangeScenario((prev) => ({ ...prev, fl: true })),
    })
  }

  if (scenario.preset !== 'historical') {
    chips.push({
      key: `preset:${scenario.preset}`,
      label:
        scenario.preset === 'pure'
          ? t('scenario.chipPureMultipliers')
          : t('scenario.chipAllMultipliers'),
      onRemove: () => onChangeScenario((prev) => ({ ...prev, preset: 'historical' })),
    })
  }

  if (scenario.system === 'custom' && scenario.custom) {
    chips.push({
      key: 'system:custom',
      label: t('scenario.chipCustomPoints', {
        preview: formatCustomPreview(scenario.custom.racePoints),
      }),
      onRemove: () =>
        onChangeScenario((prev) => ({
          ...prev,
          system: defaultSystemForYear(season),
          custom: null,
        })),
    })
  }

  if (chips.length === 0) {
    return null
  }

  return (
    <div
      role="region"
      aria-label={t('scenario.chipsRegionAria')}
      className="flex flex-wrap items-center gap-1.5"
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-label={t('scenario.chipRemoveAria', { label: chip.label })}
          onClick={chip.onRemove}
          className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text transition-colors hover:border-[#3d4552] hover:bg-surface-2"
        >
          <span>{chip.label}</span>
          <span
            aria-hidden="true"
            className="text-sm leading-none text-muted transition-colors group-hover:text-text"
          >
            &times;
          </span>
        </button>
      ))}
    </div>
  )
}
