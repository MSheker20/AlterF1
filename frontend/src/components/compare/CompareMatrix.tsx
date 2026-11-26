import { useId, useMemo, useState } from 'react'
import type { CompareResponse, SystemId } from '../../api/types'
import { strings } from '../../i18n/strings'
import { sortDrivers } from '../../lib/compare'
import type { CompareSortKey } from '../../lib/compare'
import { deltaLabel, fallbackDriverCode, formatPoints, getSurname } from '../../lib/format'
import { isKnownSystemId } from '../../lib/scenario'
import { teamColor } from '../../lib/teamColors'

interface CompareMatrixProps {
  data: CompareResponse
  selectedSystem: SystemId
  onSelectSystem: (systemId: SystemId) => void
}

const INITIAL_VISIBLE_ROWS = 20

function systemDisplayLabel(systemId: string): string {
  return systemId === 'custom' ? strings.controls.customSystemLabel : systemId
}

export function CompareMatrix({
  data,
  selectedSystem,
  onSelectSystem,
}: CompareMatrixProps) {
  const captionId = useId()
  const [sortKey, setSortKey] = useState<CompareSortKey>('real')
  const [showAll, setShowAll] = useState(false)

  // Reset sort to 'real' if the sorted system column disappears (e.g., custom removed).
  const activeSortKey: CompareSortKey =
    sortKey === 'real' || data.systems.some((sys) => sys.id === sortKey) ? sortKey : 'real'

  const driverCodeById = useMemo(() => {
    const map = new Map<string, string>()
    for (const driver of data.drivers) {
      map.set(driver.driverId, fallbackDriverCode(driver.driverCode, driver.driverName))
    }
    return map
  }, [data.drivers])

  const sortedDrivers = useMemo(
    () => sortDrivers(data.drivers, activeSortKey),
    [data.drivers, activeSortKey],
  )

  if (data.drivers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        {strings.compareMatrix.empty}
      </div>
    )
  }

  const hasOverflow = sortedDrivers.length > INITIAL_VISIBLE_ROWS
  const visibleDrivers = showAll ? sortedDrivers : sortedDrivers.slice(0, INITIAL_VISIBLE_ROWS)

  return (
    <section aria-labelledby={captionId} className="space-y-2.5">
      <p id={captionId} className="m-0 text-xs text-muted">
        {strings.compareMatrix.caption(data.season)}
      </p>

      <div className="overflow-hidden rounded-lg border border-border bg-bg">
        <div className="overflow-x-auto">
          <table
            aria-labelledby={captionId}
            className="w-full min-w-[600px] border-separate border-spacing-0 text-left"
          >
            <thead>
              <tr>
                <th
                  scope="col"
                  aria-sort={activeSortKey === 'real' ? 'ascending' : undefined}
                  className="sticky left-0 z-20 w-[168px] border-b border-r border-border bg-surface px-3 py-2.5 align-bottom sm:w-[228px]"
                >
                  <div className="flex w-[144px] items-center justify-between gap-2 sm:w-[204px]">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                      {strings.compareMatrix.driverColumn}
                    </span>
                    <button
                      type="button"
                      aria-label={strings.compareMatrix.sortByRealAria}
                      aria-pressed={activeSortKey === 'real'}
                      title={strings.compareMatrix.sortByRealAria}
                      onClick={() => setSortKey('real')}
                      className={`inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                        activeSortKey === 'real'
                          ? 'border-accent/60 bg-accent/15 text-accent'
                          : 'border-transparent text-muted hover:border-border hover:bg-surface-2 hover:text-text'
                      }`}
                    >
                      <SortIcon active={activeSortKey === 'real'} />
                    </button>
                  </div>
                </th>

                {data.systems.map((sys) => {
                  const isSelected = sys.id === selectedSystem
                  const isReal = data.realSystem === sys.id
                  const isSorted = activeSortKey === sys.id
                  const sysLabel = systemDisplayLabel(sys.id)
                  const championCode = sys.champion
                    ? (driverCodeById.get(sys.champion.driverId) ??
                      fallbackDriverCode('', sys.champion.driverName))
                    : null
                  const championSurname = sys.champion ? getSurname(sys.champion.driverName) : null

                  return (
                    <th
                      key={sys.id}
                      scope="col"
                      aria-sort={isSorted ? 'ascending' : undefined}
                      className={`min-w-[84px] border-b border-border px-2 py-2 text-center align-bottom ${
                        isSelected
                          ? 'border-b-2 border-b-accent bg-surface-2/90'
                          : 'bg-surface'
                      }`}
                    >
                      <div className="flex items-start justify-center gap-1">
                        <button
                          type="button"
                          aria-label={strings.compareMatrix.selectSystemAria(
                            sysLabel,
                            isReal,
                            championSurname,
                            sys.championChanged,
                          )}
                          aria-current={isSelected ? 'true' : undefined}
                          title={strings.compareMatrix.selectSystemTitle(sysLabel)}
                          onClick={() => {
                            if (isKnownSystemId(sys.id) && sys.id !== selectedSystem) {
                              onSelectSystem(sys.id)
                            }
                          }}
                          className="flex cursor-pointer flex-col items-center gap-0.5 rounded px-1.5 py-0.5 transition-colors hover:bg-surface-2"
                        >
                          <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums text-text">
                            <span>{sysLabel}</span>
                            {isReal && (
                              <span
                                aria-hidden="true"
                                title={strings.controls.realSystemTooltip}
                                className="h-1.5 w-1.5 rounded-full bg-accent"
                              />
                            )}
                          </span>

                          {championCode !== null && (
                            <span
                              aria-hidden="true"
                              className={`text-[10px] font-extrabold uppercase leading-none tracking-[0.06em] ${
                                sys.championChanged ? 'text-accent' : 'text-muted'
                              }`}
                            >
                              {championCode}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          aria-label={strings.compareMatrix.sortBySystemAria(sysLabel)}
                          aria-pressed={isSorted}
                          title={strings.compareMatrix.sortBySystemAria(sysLabel)}
                          onClick={() => setSortKey(isSorted ? 'real' : sys.id)}
                          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                            isSorted
                              ? 'border-accent/60 bg-accent/15 text-accent'
                              : 'border-transparent text-muted hover:border-border hover:bg-surface-2 hover:text-text'
                          }`}
                        >
                          <SortIcon active={isSorted} />
                        </button>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {visibleDrivers.map((driver) => {
                const code = fallbackDriverCode(driver.driverCode, driver.driverName)
                const color = teamColor(driver.constructorId)

                return (
                  <tr key={driver.driverId} className="group">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r border-border/75 bg-bg px-3 py-2 font-normal transition-colors group-hover:bg-surface"
                    >
                      <div className="grid w-[144px] grid-cols-[24px_4px_minmax(0,1fr)] items-center gap-x-2 sm:w-[204px]">
                        <span
                          className={`text-right text-xs font-bold tabular-nums ${
                            driver.realPosition === 1 ? 'text-gold' : 'text-muted'
                          }`}
                        >
                          {driver.realPosition !== null ? driver.realPosition : '—'}
                        </span>
                        <span
                          aria-hidden="true"
                          className="block h-6 w-1 rounded-[2px]"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-xs font-extrabold uppercase leading-tight tracking-[0.07em] text-text">
                            {code}
                          </span>
                          <span className="truncate text-[11px] leading-tight text-muted">
                            {driver.driverName}
                          </span>
                        </div>
                      </div>
                    </th>

                    {data.systems.map((sys) => {
                      const cell = driver.cells[sys.id]
                      const isSelected = sys.id === selectedSystem
                      const isLeader = cell?.position === 1

                      if (!cell) {
                        return (
                          <td
                            key={sys.id}
                            className={`border-b border-border/75 px-2 py-2 text-center align-middle transition-colors ${
                              isSelected
                                ? 'bg-surface/80 group-hover:bg-surface-2/70'
                                : 'bg-bg group-hover:bg-surface/60'
                            }`}
                          >
                            <span aria-hidden="true" className="text-xs text-muted/60">
                              —
                            </span>
                            <span className="sr-only">
                              {strings.compareMatrix.missingCellAria}
                            </span>
                          </td>
                        )
                      }

                      const diffVsReal =
                        driver.realPosition !== null && cell.position !== driver.realPosition
                          ? driver.realPosition - cell.position
                          : null
                      const delta = diffVsReal !== null ? deltaLabel(diffVsReal) : null
                      const deltaClass =
                        delta?.direction === 'up'
                          ? 'text-ok'
                          : delta?.direction === 'down'
                            ? 'text-err'
                            : 'text-muted'

                      return (
                        <td
                          key={sys.id}
                          className={`border-b border-border/75 px-2 py-2 text-center align-middle tabular-nums transition-colors ${
                            isLeader
                              ? isSelected
                                ? 'bg-gold/16 group-hover:bg-gold/20'
                                : 'bg-gold/10 group-hover:bg-gold/16'
                              : isSelected
                                ? 'bg-surface/80 group-hover:bg-surface-2/70'
                                : 'bg-bg group-hover:bg-surface/60'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5 leading-tight">
                            <div className="inline-flex items-baseline gap-1">
                              <span
                                className={`text-sm font-bold ${
                                  isLeader ? 'text-gold' : 'text-text'
                                }`}
                              >
                                {cell.position}
                              </span>
                              {delta !== null && (
                                <span className={`text-[10px] font-bold ${deltaClass}`}>
                                  <span aria-hidden="true">{delta.text}</span>
                                  <span className="sr-only"> {delta.ariaLabel}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted">
                              {formatPoints(cell.points)}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {hasOverflow && (
          <div className="border-t border-border bg-surface p-2">
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="w-full cursor-pointer rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-[#3a4250] hover:bg-[#222731]"
            >
              {showAll
                ? strings.tower.showTop(INITIAL_VISIBLE_ROWS)
                : strings.tower.showAll(sortedDrivers.length)}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function SortIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 14 14"
      fill="none"
      className="h-3 w-3"
    >
      {active ? (
        <path
          d="M7 2.5V11.5M7 2.5L4 5.5M7 2.5L10 5.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M4.5 5.25L7 2.75L9.5 5.25M4.5 8.75L7 11.25L9.5 8.75"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}
