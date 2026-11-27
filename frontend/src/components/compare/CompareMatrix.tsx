import { useId, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { SystemId } from '../../api/types'
import { systemContext } from '../../i18n/system'
import type { NormalizedCompareData } from '../../lib/championship'
import { sortCompareRows } from '../../lib/compare'
import type { CompareSortKey } from '../../lib/compare'
import { deltaLabel, formatPoints } from '../../lib/format'
import { isKnownSystemId } from '../../lib/scenario'
import { teamColor } from '../../lib/teamColors'

interface CompareMatrixProps {
  data: NormalizedCompareData
  selectedSystem: SystemId
  onSelectSystem: (systemId: SystemId) => void
}

const INITIAL_VISIBLE_ROWS = 20

function systemDisplayLabel(t: TFunction, systemId: string): string {
  return systemId === 'custom' ? t('controls.customSystemLabel') : systemId
}

function selectSystemAria(
  t: TFunction,
  system: string,
  context: 'custom' | undefined,
  isReal: boolean,
  championLabel: string | null,
  championChanged: boolean,
): string {
  const details: string[] = []
  if (isReal) {
    details.push(t('compareMatrix.detailHistorical'))
  }
  if (championLabel) {
    details.push(
      championChanged
        ? t('compareMatrix.detailChampionChanged', { surname: championLabel })
        : t('compareMatrix.detailChampion', { surname: championLabel }),
    )
  }
  return details.length > 0
    ? t('compareMatrix.selectSystemAria', { system, context, details: details.join(', ') })
    : t('compareMatrix.selectSystemAriaPlain', { system, context })
}

export function CompareMatrix({
  data,
  selectedSystem,
  onSelectSystem,
}: CompareMatrixProps) {
  const { t } = useTranslation()
  const captionId = useId()
  const isConstructors = data.mode === 'constructors'
  const hideReal = data.alternative

  const defaultSortKey: CompareSortKey = hideReal
    ? (data.systems.find((sys) => sys.id === selectedSystem)?.id ??
      data.realSystem ??
      data.systems[0]?.id ??
      'real')
    : 'real'

  const [sortKey, setSortKey] = useState<CompareSortKey | null>(null)
  const [showAll, setShowAll] = useState(false)

  // Reset to default sort if the sorted system column disappears (e.g., custom removed).
  const candidateSort = sortKey ?? defaultSortKey
  const activeSortKey: CompareSortKey =
    (candidateSort === 'real' && !hideReal) || data.systems.some((sys) => sys.id === candidateSort)
      ? candidateSort
      : defaultSortKey

  const sortedRows = useMemo(
    () => sortCompareRows(data.rows, activeSortKey),
    [data.rows, activeSortKey],
  )

  if (data.rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        {t('compareMatrix.empty')}
      </div>
    )
  }

  const hasOverflow = sortedRows.length > INITIAL_VISIBLE_ROWS
  const visibleRows = showAll ? sortedRows : sortedRows.slice(0, INITIAL_VISIBLE_ROWS)

  return (
    <section aria-labelledby={captionId} className="space-y-2.5">
      <p id={captionId} className="m-0 text-xs text-muted">
        {t(isConstructors ? 'compareMatrix.captionConstructors' : 'compareMatrix.caption', {
          season: data.season,
        })}
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
                  aria-sort={!hideReal && activeSortKey === 'real' ? 'ascending' : undefined}
                  className="sticky left-0 z-20 w-[168px] border-b border-r border-border bg-surface px-3 py-2.5 align-bottom sm:w-[228px]"
                >
                  <div className="flex w-[144px] items-center justify-between gap-2 sm:w-[204px]">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                      {isConstructors
                        ? t('compareMatrix.constructorColumn')
                        : t('compareMatrix.driverColumn')}
                    </span>
                    {!hideReal && (
                      <button
                        type="button"
                        aria-label={t('compareMatrix.sortByRealAria')}
                        aria-pressed={activeSortKey === 'real'}
                        title={t('compareMatrix.sortByRealAria')}
                        onClick={() => setSortKey('real')}
                        className={`inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                          activeSortKey === 'real'
                            ? 'border-accent/60 bg-accent/15 text-accent-text'
                            : 'border-transparent text-muted hover:border-border hover:bg-surface-2 hover:text-text'
                        }`}
                      >
                        <SortIcon active={activeSortKey === 'real'} />
                      </button>
                    )}
                  </div>
                </th>

                {data.systems.map((sys) => {
                  const isSelected = sys.id === selectedSystem
                  const isReal = data.realSystem === sys.id
                  const isSorted = activeSortKey === sys.id
                  const sysLabel = systemDisplayLabel(t, sys.id)

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
                          aria-current={isSelected ? 'true' : undefined}
                          title={t('compareMatrix.selectSystemTitle', {
                            system: sysLabel,
                            context: systemContext(sys.id),
                          })}
                          onClick={() => {
                            if (isKnownSystemId(sys.id) && sys.id !== selectedSystem) {
                              onSelectSystem(sys.id)
                            }
                          }}
                          className="flex cursor-pointer flex-col items-center gap-0.5 rounded px-1.5 py-0.5 transition-colors hover:bg-surface-2"
                        >
                          {/* Named by this sentence (label-in-name): the visible "1950 / PRO" is decoration. */}
                          <span className="sr-only">
                            {selectSystemAria(
                              t,
                              sysLabel,
                              systemContext(sys.id),
                              isReal,
                              sys.championLabel,
                              sys.championChanged,
                            )}
                          </span>
                          <span
                            aria-hidden="true"
                            className="inline-flex items-center gap-1 text-xs font-bold tabular-nums text-text"
                          >
                            <span>{sysLabel}</span>
                            {isReal && (
                              <span
                                aria-hidden="true"
                                title={t('controls.realSystemTooltip')}
                                className="h-1.5 w-1.5 rounded-full bg-accent"
                              />
                            )}
                          </span>

                          {sys.championBadge !== null && (
                            <span
                              aria-hidden="true"
                              className={`${
                                isConstructors
                                  ? 'max-w-[96px] truncate text-[10px] font-bold leading-tight'
                                  : 'text-[10px] font-extrabold uppercase leading-none tracking-[0.06em]'
                              } ${sys.championChanged ? 'text-accent-text' : 'text-muted'}`}
                            >
                              {sys.championBadge}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          aria-label={t('compareMatrix.sortBySystemAria', {
                            system: sysLabel,
                            context: systemContext(sys.id),
                          })}
                          aria-pressed={isSorted}
                          title={t('compareMatrix.sortBySystemAria', {
                            system: sysLabel,
                            context: systemContext(sys.id),
                          })}
                          onClick={() =>
                            setSortKey(isSorted ? (hideReal ? defaultSortKey : 'real') : sys.id)
                          }
                          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                            isSorted
                              ? 'border-accent/60 bg-accent/15 text-accent-text'
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
              {visibleRows.map((row) => {
                const color = teamColor(row.constructorId)

                return (
                  <tr key={row.id} className="group">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-r border-border/75 bg-bg px-3 py-2 font-normal transition-colors group-hover:bg-surface"
                    >
                      <div
                        className={`grid w-[144px] ${
                          hideReal
                            ? 'grid-cols-[4px_minmax(0,1fr)]'
                            : 'grid-cols-[24px_4px_minmax(0,1fr)]'
                        } items-center gap-x-2 sm:w-[204px]`}
                      >
                        {!hideReal && (
                          <span
                            className={`text-right text-xs font-bold tabular-nums ${
                              row.realPosition === 1 ? 'text-gold' : 'text-muted'
                            }`}
                          >
                            {row.realPosition !== null ? row.realPosition : '—'}
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className="block h-6 w-1 rounded-[2px]"
                          style={{ backgroundColor: color }}
                        />
                        {row.code !== null ? (
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-extrabold uppercase leading-tight tracking-[0.07em] text-text">
                              {row.code}
                            </span>
                            <span className="truncate text-[11px] leading-tight text-muted">
                              {row.name}
                            </span>
                          </div>
                        ) : (
                          <span className="truncate text-xs font-semibold leading-tight text-text">
                            {row.name}
                          </span>
                        )}
                      </div>
                    </th>

                    {data.systems.map((sys) => {
                      const cell = row.cells[sys.id]
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
                              {t('compareMatrix.missingCellAria')}
                            </span>
                          </td>
                        )
                      }

                      const diffVsReal =
                        !hideReal &&
                        row.realPosition !== null &&
                        cell.position !== row.realPosition
                          ? row.realPosition - cell.position
                          : null
                      const delta = diffVsReal !== null ? deltaLabel(t, diffVsReal) : null
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
                ? t(isConstructors ? 'tower.showTopConstructors' : 'tower.showTop', {
                    limit: INITIAL_VISIBLE_ROWS,
                  })
                : t(isConstructors ? 'tower.showAllConstructors' : 'tower.showAll', {
                    total: sortedRows.length,
                  })}
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
