import { useId } from 'react'
import type { SeasonSummary } from '../../api/types'
import { strings } from '../../i18n/strings'

interface YearSelectProps {
  seasons: readonly SeasonSummary[]
  selectedYear: number
  onChange: (year: number) => void
  disabled?: boolean
}

export function YearSelect({
  seasons,
  selectedYear,
  onChange,
  disabled = false,
}: YearSelectProps) {
  const selectId = useId()

  const orderedYears = [...seasons].reverse().map((s) => s.year)
  const hasSelected = orderedYears.includes(selectedYear)
  const years = hasSelected ? orderedYears : [selectedYear, ...orderedYears]

  return (
    <div className="relative inline-flex items-center">
      <label htmlFor={selectId} className="sr-only">
        {strings.controls.seasonLabel}
      </label>
      <select
        id={selectId}
        aria-label={strings.controls.seasonLabel}
        value={String(selectedYear)}
        disabled={disabled}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10)
          if (Number.isInteger(next) && next !== selectedYear) {
            onChange(next)
          }
        }}
        className="h-9 cursor-pointer appearance-none rounded-lg border border-border bg-surface pl-3 pr-8 text-sm font-semibold tabular-nums text-text transition-colors hover:border-[#363d48] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {years.map((year) => (
          <option key={year} value={String(year)} className="bg-surface text-text">
            {year}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-muted"
      >
        <path
          d="M4 6.25L8 10.25L12 6.25"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
