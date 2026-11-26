import type { RaceSummary } from '../../api/types'
import { strings } from '../../i18n/strings'

interface RaceResultsGridProps {
  races: readonly RaceSummary[]
  results: readonly string[]
  variant?: 'table' | 'chips'
}

type ResultTone = 'win' | 'podium' | 'points' | 'other' | 'empty'

function classifyResult(result: string): ResultTone {
  if (result === '') {
    return 'empty'
  }
  if (result === '1') {
    return 'win'
  }
  if (result === '2' || result === '3') {
    return 'podium'
  }
  if (/^\d+$/.test(result)) {
    const position = Number.parseInt(result, 10)
    if (position >= 4 && position <= 10) {
      return 'points'
    }
  }
  return 'other'
}

const TONE_CELL_CLASSES: Record<ResultTone, string> = {
  win: 'bg-gold/16 border-gold/55 text-gold font-bold',
  podium: 'bg-silver/12 border-silver/40 text-silver font-bold',
  points: 'bg-surface-2 border-[#343b46] text-text font-semibold',
  other: 'bg-[#101318] border-border text-muted font-medium',
  empty: 'bg-transparent border-dashed border-border text-muted/40 font-normal',
}

const TONE_GP_CLASSES: Record<ResultTone, string> = {
  win: 'text-gold/85',
  podium: 'text-silver/85',
  points: 'text-muted',
  other: 'text-muted',
  empty: 'text-[#5b6370]',
}

const SKIPPED_CELL_CLASS =
  'bg-bg/40 border-dashed border-border text-muted/60 font-normal opacity-45 line-through'

export function RaceResultsGrid({
  races,
  results,
  variant = 'table',
}: RaceResultsGridProps) {
  if (races.length === 0) {
    return null
  }

  if (variant === 'chips') {
    return (
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
        {races.map((race, index) => {
          const result = results[index] ?? ''
          const tone = classifyResult(result)
          const cellClass = race.skipped ? SKIPPED_CELL_CLASS : TONE_CELL_CLASSES[tone]
          const gpClass = race.skipped ? 'text-muted/60' : TONE_GP_CLASSES[tone]
          const title = race.skipped
            ? `${race.round}. ${race.code} (${race.date}) — ${strings.detail.raceSkippedSuffix}`
            : `${race.round}. ${race.code} (${race.date})`

          return (
            <div
              key={race.round}
              title={title}
              className={`flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-[7px] border px-1 py-1.5 ${cellClass}`}
            >
              <span
                aria-hidden="true"
                className={`text-[10px] font-bold uppercase leading-none tracking-[0.06em] ${gpClass}`}
              >
                {race.code}
              </span>
              <span aria-hidden="true" className="text-[13px] leading-tight tabular-nums">
                {result === '' ? '—' : result}
              </span>
              <span className="sr-only">
                {strings.detail.raceResultAria(race.round, race.code, result, race.skipped)}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-0.5">
      <table
        aria-label={strings.detail.raceTableAria}
        className="w-max min-w-full border-separate border-spacing-0 text-center"
      >
        <thead>
          <tr>
            {races.map((race) => (
              <th
                key={race.round}
                scope="col"
                title={
                  race.skipped
                    ? `${race.round}. ${race.code} (${race.date}) — ${strings.detail.raceSkippedSuffix}`
                    : `${race.round}. ${race.code} (${race.date})`
                }
                className={`min-w-[38px] border-b border-border px-1 py-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted ${
                  race.skipped ? 'opacity-45 line-through' : ''
                }`}
              >
                {race.code}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {races.map((race, index) => {
              const result = results[index] ?? ''
              const tone = classifyResult(result)
              const cellClass = race.skipped ? SKIPPED_CELL_CLASS : TONE_CELL_CLASSES[tone]

              return (
                <td key={race.round} className="px-[3px] py-2">
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-6 w-8 items-center justify-center rounded-[5px] border text-[11px] tabular-nums ${cellClass}`}
                  >
                    {result === '' ? '—' : result}
                  </span>
                  <span className="sr-only">
                    {strings.detail.raceResultAria(race.round, race.code, result, race.skipped)}
                  </span>
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
