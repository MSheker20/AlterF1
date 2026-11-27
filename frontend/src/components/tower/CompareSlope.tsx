import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChampionshipMode } from '../../api/types'
import { systemContext, systemLabel } from '../../i18n/system'
import { isDriverStanding, standingEntryId, standingEntryName } from '../../lib/championship'
import type { StandingEntry } from '../../lib/championship'
import { deltaLabel, fallbackDriverCode, formatPoints } from '../../lib/format'
import { teamColor } from '../../lib/teamColors'

interface CompareSlopeProps {
  standings: readonly StandingEntry[]
  systemId: string
  realSystem: string | null
  mode?: ChampionshipMode
}

interface SlopeLine {
  entryId: string
  color: string
  changed: boolean
  x1: number
  y1: number
  x2: number
  y2: number
  cx: number
}

const MAX_SLOPE_ROWS = 20

function slopeRowLabel(row: StandingEntry): string {
  return isDriverStanding(row)
    ? fallbackDriverCode(row.driverCode, row.driverName)
    : row.teamName
}

export function CompareSlope({
  standings,
  systemId,
  realSystem,
  mode = 'drivers',
}: CompareSlopeProps) {
  const { t } = useTranslation()
  const isConstructors = mode === 'constructors'
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })
  const [lines, setLines] = useState<SlopeLine[]>([])

  const gridRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const leftRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const rightRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const leftRows = useMemo(() => {
    return standings
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const posA = a.row.realPosition ?? Number.POSITIVE_INFINITY
        const posB = b.row.realPosition ?? Number.POSITIVE_INFINITY
        if (posA !== posB) {
          return posA - posB
        }
        return a.index - b.index
      })
      .slice(0, MAX_SLOPE_ROWS)
      .map((entry) => entry.row)
  }, [standings])

  const rightRows = useMemo(() => standings.slice(0, MAX_SLOPE_ROWS), [standings])

  const entryMap = useMemo(() => {
    const map = new Map<string, StandingEntry>()
    for (const row of standings) {
      map.set(standingEntryId(row), row)
    }
    return map
  }, [standings])

  const activeEntryId = hoveredId ?? pinnedId
  const activeEntry = activeEntryId ? (entryMap.get(activeEntryId) ?? null) : null

  const recomputeLines = useCallback(() => {
    const svgEl = svgRef.current
    if (!svgEl) {
      return
    }
    const svgRect = svgEl.getBoundingClientRect()
    if (svgRect.width <= 0 || svgRect.height <= 0) {
      setLines([])
      return
    }

    const leftIndexById = new Map<string, number>()
    leftRows.forEach((row, idx) => leftIndexById.set(standingEntryId(row), idx))

    const x1 = 4
    const x2 = svgRect.width - 4
    const cx = svgRect.width / 2

    const computed: SlopeLine[] = []
    rightRows.forEach((row, rightIndex) => {
      const id = standingEntryId(row)
      const leftIndex = leftIndexById.get(id)
      if (leftIndex === undefined) {
        return
      }
      const leftEl = leftRefs.current.get(id)
      const rightEl = rightRefs.current.get(id)
      if (!leftEl || !rightEl) {
        return
      }

      const lRect = leftEl.getBoundingClientRect()
      const rRect = rightEl.getBoundingClientRect()
      const y1 = lRect.top + lRect.height / 2 - svgRect.top
      const y2 = rRect.top + rRect.height / 2 - svgRect.top
      const changed = leftIndex !== rightIndex

      computed.push({
        entryId: id,
        color: teamColor(row.constructorId),
        changed,
        x1,
        y1,
        x2,
        y2,
        cx,
      })
    })

    // Draw unchanged lines first, changed lines on top.
    computed.sort((a, b) => Number(a.changed) - Number(b.changed))
    setSvgSize({ width: svgRect.width, height: svgRect.height })
    setLines(computed)
  }, [leftRows, rightRows])

  useLayoutEffect(() => {
    recomputeLines()

    const target = gridRef.current
    if (!target) {
      return
    }

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => {
        recomputeLines()
      })
      observer.observe(target)
      return () => {
        observer.disconnect()
      }
    }

    window.addEventListener('resize', recomputeLines)
    return () => {
      window.removeEventListener('resize', recomputeLines)
    }
  }, [recomputeLines])

  // New data clears the highlight (state adjusted during render, no effect).
  const [shownStandings, setShownStandings] = useState(standings)
  if (standings !== shownStandings) {
    setShownStandings(standings)
    setPinnedId(null)
    setHoveredId(null)
  }

  useEffect(() => {
    if (!pinnedId) {
      return
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPinnedId(null)
        setHoveredId(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [pinnedId])

  const realHeaderLabel = realSystem
    ? t('compare.realColumnWithSystem', { system: realSystem })
    : t('compare.realColumn')
  const altHeaderLabel = systemLabel(t, systemId)

  const orderedLines = useMemo(() => {
    if (!activeEntryId) {
      return lines
    }
    return [...lines].sort((a, b) => {
      const aActive = a.entryId === activeEntryId ? 1 : 0
      const bActive = b.entryId === activeEntryId ? 1 : 0
      return aActive - bActive
    })
  }, [lines, activeEntryId])

  const columnsClass = isConstructors
    ? 'grid-cols-[minmax(122px,152px)_1fr_minmax(122px,152px)]'
    : 'grid-cols-[minmax(112px,138px)_1fr_minmax(112px,138px)]'

  return (
    <section
      aria-label={t('compare.sectionAriaLabel')}
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-bg"
    >
      <div className={`grid ${columnsClass} items-end border-b border-border bg-surface px-2.5 pt-1.5`}>
        <div className="flex items-center justify-between border-b-2 border-transparent px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
          <span className="truncate">{realHeaderLabel}</span>
          <span className="tabular-nums">{t('compare.pointsColumn')}</span>
        </div>
        <div className="pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
          {t('compare.diffColumn')}
        </div>
        <div className="flex items-center justify-between border-b-2 border-accent px-1.5 pb-1.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-text">
          <span>{altHeaderLabel}</span>
          <span className="tabular-nums">{t('compare.pointsColumn')}</span>
        </div>
      </div>

      <div
        className="px-2.5 py-2"
        onClick={(event) => {
          if (
            pinnedId &&
            event.target instanceof Element &&
            !event.target.closest('button')
          ) {
            setPinnedId(null)
            setHoveredId(null)
          }
        }}
      >
        <div
          ref={gridRef}
          className={`relative grid ${columnsClass} items-stretch`}
        >
          <div
            role="group"
            aria-label={t('compare.realListAria')}
            className="flex flex-col gap-0.5"
          >
            {leftRows.map((row) => {
              const id = standingEntryId(row)
              const name = standingEntryName(row)
              const isMatch = activeEntryId === id
              const isDimmed = activeEntryId !== null && !isMatch
              const posText = row.realPosition !== null ? String(row.realPosition) : '—'
              const ptsText = row.realPoints !== null ? formatPoints(row.realPoints) : '—'
              const label = slopeRowLabel(row)

              return (
                <button
                  key={id}
                  ref={(node) => {
                    if (node) {
                      leftRefs.current.set(id, node)
                    } else {
                      leftRefs.current.delete(id)
                    }
                  }}
                  type="button"
                  title={name}
                  aria-pressed={pinnedId === id}
                  aria-label={t('compare.rowAria', {
                    side: realHeaderLabel,
                    pos: posText,
                    driver: name,
                    points: ptsText,
                  })}
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') {
                      setHoveredId(id)
                    }
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') {
                      setHoveredId((prev) => (prev === id ? null : prev))
                    }
                  }}
                  onFocus={() => setHoveredId(id)}
                  onBlur={() => setHoveredId((prev) => (prev === id ? null : prev))}
                  onClick={() => {
                    if (pinnedId === id) {
                      setPinnedId(null)
                      setHoveredId(null)
                    } else {
                      setPinnedId(id)
                    }
                  }}
                  className={`grid h-8 w-full cursor-pointer grid-cols-[18px_3px_1fr_auto] items-center gap-x-1.5 rounded-md border px-1.5 text-left transition-all ${
                    isMatch
                      ? 'border-[#3a4250] bg-surface-2 opacity-100'
                      : isDimmed
                        ? 'border-transparent opacity-25 hover:bg-surface'
                        : 'border-transparent hover:bg-surface'
                  }`}
                >
                  <span
                    className={`text-right text-[11px] font-bold tabular-nums ${
                      row.realPosition === 1 ? 'text-gold' : 'text-muted'
                    }`}
                  >
                    {posText}
                  </span>
                  <span
                    aria-hidden="true"
                    className="block h-4 w-[3px] rounded-[2px]"
                    style={{ backgroundColor: teamColor(row.constructorId) }}
                  />
                  <span
                    className={
                      isConstructors
                        ? 'truncate text-xs font-semibold text-text'
                        : 'truncate text-xs font-bold uppercase tracking-[0.06em] text-text'
                    }
                  >
                    {label}
                  </span>
                  <span className="text-right text-xs font-semibold tabular-nums text-muted">
                    {ptsText}
                  </span>
                </button>
              )
            })}
          </div>

          <div aria-hidden="true" className="relative min-w-[44px]">
            <svg
              ref={svgRef}
              viewBox={
                svgSize.width > 0 && svgSize.height > 0
                  ? `0 0 ${svgSize.width} ${svgSize.height}`
                  : undefined
              }
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            >
              {orderedLines.map((line) => {
                const isMatch = activeEntryId === line.entryId
                const isDimmed = activeEntryId !== null && !isMatch
                const strokeWidth = isMatch ? 3.2 : line.changed ? 2.5 : 1
                const opacity = isMatch ? 1 : isDimmed ? 0.08 : line.changed ? 1 : 0.35

                return (
                  <g key={line.entryId}>
                    <path
                      d={`M ${line.x1} ${line.y1} C ${line.cx} ${line.y1}, ${line.cx} ${line.y2}, ${line.x2} ${line.y2}`}
                      fill="none"
                      stroke={line.color}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      opacity={opacity}
                      className="transition-opacity duration-150"
                    />
                    {(line.changed || isMatch) && (
                      <>
                        <circle
                          cx={line.x1}
                          cy={line.y1}
                          r={2.5}
                          fill={line.color}
                          opacity={opacity}
                        />
                        <circle
                          cx={line.x2}
                          cy={line.y2}
                          r={2.5}
                          fill={line.color}
                          opacity={opacity}
                        />
                      </>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          <div
            role="group"
            aria-label={t('compare.altListAria', {
              context: systemContext(systemId),
              system: altHeaderLabel,
            })}
            className="flex flex-col gap-0.5"
          >
            {rightRows.map((row) => {
              const id = standingEntryId(row)
              const name = standingEntryName(row)
              const isMatch = activeEntryId === id
              const isDimmed = activeEntryId !== null && !isMatch
              const ptsText = formatPoints(row.points)
              const label = slopeRowLabel(row)

              return (
                <button
                  key={id}
                  ref={(node) => {
                    if (node) {
                      rightRefs.current.set(id, node)
                    } else {
                      rightRefs.current.delete(id)
                    }
                  }}
                  type="button"
                  title={name}
                  aria-pressed={pinnedId === id}
                  aria-label={t('compare.rowAria', {
                    side: altHeaderLabel,
                    pos: String(row.position),
                    driver: name,
                    points: ptsText,
                  })}
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') {
                      setHoveredId(id)
                    }
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') {
                      setHoveredId((prev) => (prev === id ? null : prev))
                    }
                  }}
                  onFocus={() => setHoveredId(id)}
                  onBlur={() => setHoveredId((prev) => (prev === id ? null : prev))}
                  onClick={() => {
                    if (pinnedId === id) {
                      setPinnedId(null)
                      setHoveredId(null)
                    } else {
                      setPinnedId(id)
                    }
                  }}
                  className={`grid h-8 w-full cursor-pointer grid-cols-[18px_3px_1fr_auto] items-center gap-x-1.5 rounded-md border px-1.5 text-left transition-all ${
                    isMatch
                      ? 'border-[#3a4250] bg-surface-2 opacity-100'
                      : isDimmed
                        ? 'border-transparent opacity-25 hover:bg-surface'
                        : 'border-transparent hover:bg-surface'
                  }`}
                >
                  <span
                    className={`text-right text-[11px] font-bold tabular-nums ${
                      row.position === 1 ? 'text-gold' : 'text-muted'
                    }`}
                  >
                    {row.position}
                  </span>
                  <span
                    aria-hidden="true"
                    className="block h-4 w-[3px] rounded-[2px]"
                    style={{ backgroundColor: teamColor(row.constructorId) }}
                  />
                  <span
                    className={
                      isConstructors
                        ? 'truncate text-xs font-semibold text-text'
                        : 'truncate text-xs font-bold uppercase tracking-[0.06em] text-text'
                    }
                  >
                    {label}
                  </span>
                  <span className="text-right text-xs font-bold tabular-nums text-text">
                    {ptsText}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div
        aria-live="polite"
        className="flex min-h-12 items-center justify-between gap-2.5 border-t border-border bg-surface px-3.5 py-2.5 text-xs"
      >
        {activeEntry ? (
          <CompareInspector row={activeEntry} systemId={systemId} />
        ) : (
          <span className="text-[11px] text-muted">
            {isConstructors
              ? t('compare.inspectorHintConstructors')
              : t('compare.inspectorHint')}
          </span>
        )}
      </div>
    </section>
  )
}

interface CompareInspectorProps {
  row: StandingEntry
  systemId: string
}

function CompareInspector({ row, systemId }: CompareInspectorProps) {
  const { t } = useTranslation()
  const isDriver = isDriverStanding(row)
  const delta = deltaLabel(t, row.positionChange)
  const deltaClass =
    delta.direction === 'up'
      ? 'font-bold text-ok'
      : delta.direction === 'down'
        ? 'font-bold text-err'
        : 'font-medium text-muted'

  const realPosLabel =
    row.realPosition !== null
      ? t('detail.positionBadge', { position: row.realPosition })
      : t('detail.unclassified')
  const realPtsLabel = row.realPoints !== null ? formatPoints(row.realPoints) : '—'

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className="h-5 w-1 shrink-0 rounded-[2px]"
          style={{ backgroundColor: teamColor(row.constructorId) }}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-bold text-text">
            {isDriver ? `${row.driverName} · ${row.constructorName}` : row.teamName}
          </span>
          <span className="text-[11px] tabular-nums text-muted">
            {t('compare.inspectorTransition', {
              realPos: realPosLabel,
              realPts: realPtsLabel,
              system: systemLabel(t, systemId),
              altPos: row.position,
              altPts: formatPoints(row.points),
            })}
          </span>
        </div>
      </div>
      <span className={`shrink-0 tabular-nums ${deltaClass}`}>
        <span aria-hidden="true">{delta.text}</span>
        <span className="sr-only">{delta.ariaLabel}</span>
      </span>
    </>
  )
}
