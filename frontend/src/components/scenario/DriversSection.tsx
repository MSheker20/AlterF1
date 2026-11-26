import { useId, useMemo, useState } from 'react'
import type { EntrantSummary } from '../../api/types'
import { strings } from '../../i18n/strings'
import { fallbackDriverCode } from '../../lib/format'
import { teamColor } from '../../lib/teamColors'

interface DriversSectionProps {
  entrants: readonly EntrantSummary[]
  excludedDrivers: readonly string[]
  onToggleDriver: (driverId: string) => void
  error?: string | null
}

export function DriversSection({
  entrants,
  excludedDrivers,
  onToggleDriver,
  error = null,
}: DriversSectionProps) {
  const searchId = useId()
  const [query, setQuery] = useState('')

  const excludedSet = useMemo(() => new Set(excludedDrivers), [excludedDrivers])

  const filteredEntrants = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (trimmed.length === 0) {
      return entrants
    }
    return entrants.filter((entrant) => {
      const code = fallbackDriverCode(entrant.driverCode, entrant.driverName).toLowerCase()
      return (
        entrant.driverName.toLowerCase().includes(trimmed) ||
        code.includes(trimmed) ||
        entrant.constructorName.toLowerCase().includes(trimmed)
      )
    })
  }, [entrants, query])

  const removedCount = excludedDrivers.length

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 flex w-full items-center justify-between gap-2 p-0">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          {strings.scenario.driversLegend}
        </span>
        <span
          className={`text-[11px] font-semibold tabular-nums ${
            removedCount > 0 ? 'text-accent' : 'text-muted'
          }`}
        >
          {strings.scenario.driversRemoved(removedCount)}
        </span>
      </legend>

      <label htmlFor={searchId} className="sr-only">
        {strings.scenario.driversSearchLabel}
      </label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={strings.scenario.driversSearchPlaceholder}
        className="mb-2 h-8 w-full rounded-md border border-border bg-bg px-2.5 text-xs text-text placeholder:text-muted/70 focus:border-[#3d4552]"
      />

      {filteredEntrants.length === 0 ? (
        <p className="m-0 rounded-md border border-border bg-bg px-3 py-3 text-center text-xs text-muted">
          {strings.scenario.driversEmpty}
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-bg p-1">
          {filteredEntrants.map((entrant) => {
            const isExcluded = excludedSet.has(entrant.driverId)
            const code = fallbackDriverCode(entrant.driverCode, entrant.driverName)

            return (
              <label
                key={entrant.driverId}
                className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-surface ${
                  isExcluded ? 'bg-surface/80 text-muted' : 'text-text'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isExcluded}
                  onChange={() => onToggleDriver(entrant.driverId)}
                  className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-accent"
                />
                <span
                  aria-hidden="true"
                  className="h-4 w-1 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: teamColor(entrant.constructorId) }}
                />
                {/* The code is visual only: the checkbox is named by the driver's full name. */}
                <span
                  aria-hidden="true"
                  className={`w-9 shrink-0 font-bold uppercase tracking-[0.06em] ${
                    isExcluded ? 'line-through' : ''
                  }`}
                >
                  {code}
                </span>
                <span className={`min-w-0 truncate ${isExcluded ? 'line-through' : ''}`}>
                  {entrant.driverName}
                </span>
              </label>
            )
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-err">
          {error}
        </p>
      )}
    </fieldset>
  )
}
