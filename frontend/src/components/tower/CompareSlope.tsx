import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { StandingRow } from '../../api/types'
import { strings } from '../../i18n/strings'
import { deltaLabel, fallbackDriverCode, formatPoints } from '../../lib/format'
import { teamColor } from '../../lib/teamColors'

interface CompareSlopeProps {
  standings: readonly StandingRow[]
  systemId: string
  realSystem: string | null
}

interface SlopeLine {
  driverId: string
  color: string
  changed: boolean
  x1: number
  y1: number
  x2: number
  y2: number
  cx: number
}

const MAX_SLOPE_ROWS = 20

export function CompareSlope({ standings, systemId, realSystem }: CompareSlopeProps) {
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

  const driverMap = useMemo(() => {
    const map = new Map<string, StandingRow>()
    for (const row of standings) {
      map.set(row.driverId, row)
    }
    return map
  }, [standings])

  const activeDriverId = hoveredId ?? pinnedId
  const activeDriver = activeDriverId ? (driverMap.get(activeDriverId) ?? null) : null

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
    leftRows.forEach((row, idx) => leftIndexById.set(row.driverId, idx))

    const x1 = 4
    const x2 = svgRect.width - 4
    const cx = svgRect.width / 2

    const computed: SlopeLine[] = []
    rightRows.forEach((row, rightIndex) => {
      const leftIndex = leftIndexById.get(row.driverId)
      if (leftIndex === undefined) {
        return
      }
      const leftEl = leftRefs.current.get(row.driverId)
      const rightEl = rightRefs.current.get(row.driverId)
      if (!leftEl || !rightEl) {
        return
      }

      const lRect = leftEl.getBoundingClientRect()
      const rRect = rightEl.getBoundingClientRect()
      const y1 = lRect.top + lRect.height / 2 - svgRect.top
      const y2 = rRect.top + rRect.height / 2 - svgRect.top
      const changed = leftIndex !== rightIndex

      computed.push({
        driverId: row.driverId,
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
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [pinnedId])

  const realHeaderLabel = realSystem
    ? strings.compare.realColumnWithSystem(realSystem)
    : strings.compare.realColumn

  const orderedLines = useMemo(() => {
    if (!activeDriverId) {
      return lines
    }
    return [...lines].sort((a, b) => {
      const aActive = a.driverId === activeDriverId ? 1 : 0
      const bActive = b.driverId === activeDriverId ? 1 : 0
      return aActive - bActive
    })
  }, [lines, activeDriverId])

  return (
    <section
      aria-label={strings.compare.sectionAriaLabel}
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-bg"
    >
      <div className="grid grid-cols-[minmax(112px,138px)_1fr_minmax(112px,138px)] items-end border-b border-border bg-surface px-2.5 pt-1.5">
        <div className="flex items-center justify-between border-b-2 border-transparent px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
          <span className="truncate">{realHeaderLabel}</span>
          <span className="tabular-nums">{strings.compare.pointsColumn}</span>
        </div>
        <div className="pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
          {strings.compare.diffColumn}
        </div>
        <div className="flex items-center justify-between border-b-2 border-accent px-1.5 pb-1.5 text-[11px] font-extrabold uppercase tracking-[0.05em] text-text">
          <span>{systemId}</span>
          <span className="tabular-nums">{strings.compare.pointsColumn}</span>
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
          }
        }}
      >
        <div
          ref={gridRef}
          className="relative grid grid-cols-[minmax(112px,138px)_1fr_minmax(112px,138px)] items-stretch"
        >
          <div
            role="group"
            aria-label={strings.compare.realListAria}
            className="flex flex-col gap-0.5"
          >
            {leftRows.map((row) => {
              const isMatch = activeDriverId === row.driverId
              const isDimmed = activeDriverId !== null && !isMatch
              const posText = row.realPosition !== null ? String(row.realPosition) : '—'
              const ptsText = row.realPoints !== null ? formatPoints(row.realPoints) : '—'
              const code = fallbackDriverCode(row.driverCode, row.driverName)

              return (
                <button
                  key={row.driverId}
                  ref={(node) => {
                    if (node) {
                      leftRefs.current.set(row.driverId, node)
                    } else {
                      leftRefs.current.delete(row.driverId)
                    }
                  }}
                  type="button"
                  aria-pressed={pinnedId === row.driverId}
                  aria-label={strings.compare.rowAria(
                    realHeaderLabel,
                    posText,
                    row.driverName,
                    ptsText,
                  )}
                  onPointerEnter={() => setHoveredId(row.driverId)}
                  onPointerLeave={() =>
                    setHoveredId((prev) => (prev === row.driverId ? null : prev))
                  }
                  onFocus={() => setHoveredId(row.driverId)}
                  onBlur={() =>
                    setHoveredId((prev) => (prev === row.driverId ? null : prev))
                  }
                  onClick={() =>
                    setPinnedId((prev) => (prev === row.driverId ? null : row.driverId))
                  }
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
                  <span className="truncate text-xs font-bold uppercase tracking-[0.06em] text-text">
                    {code}
                  </span>
                  <span className="text-right text-xs font-semibold tabular-nums text-muted">
                    {ptsText}
                  </span>
                </button>
              )
            })}
          </div>

          <div aria-hidden="true" className="relative min-w-[52px]">
            <svg
              ref={svgRef}
              viewBox={
                svgSize.width > 0 && svgSize.height > 0
                  ? `0 0 ${svgSize.width} ${svgSize.height}`
                  : undefined
              }
              className="pointer-events-none block h-full w-full overflow-visible"
            >
              {orderedLines.map((line) => {
                const isMatch = activeDriverId === line.driverId
                const isDimmed = activeDriverId !== null && !isMatch
                const strokeWidth = isMatch ? 3.2 : line.changed ? 2.5 : 1
                const opacity = isMatch ? 1 : isDimmed ? 0.08 : line.changed ? 1 : 0.35

                return (
                  <g key={line.driverId}>
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
            aria-label={strings.compare.altListAria(systemId)}
            className="flex flex-col gap-0.5"
          >
            {rightRows.map((row) => {
              const isMatch = activeDriverId === row.driverId
              const isDimmed = activeDriverId !== null && !isMatch
              const ptsText = formatPoints(row.points)
              const code = fallbackDriverCode(row.driverCode, row.driverName)

              return (
                <button
                  key={row.driverId}
                  ref={(node) => {
                    if (node) {
                      rightRefs.current.set(row.driverId, node)
                    } else {
                      rightRefs.current.delete(row.driverId)
                    }
                  }}
                  type="button"
                  aria-pressed={pinnedId === row.driverId}
                  aria-label={strings.compare.rowAria(
                    systemId,
                    String(row.position),
                    row.driverName,
                    ptsText,
                  )}
                  onPointerEnter={() => setHoveredId(row.driverId)}
                  onPointerLeave={() =>
                    setHoveredId((prev) => (prev === row.driverId ? null : prev))
                  }
                  onFocus={() => setHoveredId(row.driverId)}
                  onBlur={() =>
                    setHoveredId((prev) => (prev === row.driverId ? null : prev))
                  }
                  onClick={() =>
                    setPinnedId((prev) => (prev === row.driverId ? null : row.driverId))
                  }
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
                  <span className="truncate text-xs font-bold uppercase tracking-[0.06em] text-text">
                    {code}
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
        {activeDriver ? (
          <CompareInspector row={activeDriver} systemId={systemId} />
        ) : (
          <span className="text-[11px] text-muted">{strings.compare.inspectorHint}</span>
        )}
      </div>
    </section>
  )
}

interface CompareInspectorProps {
  row: StandingRow
  systemId: string
}

function CompareInspector({ row, systemId }: CompareInspectorProps) {
  const delta = deltaLabel(row.positionChange)
  const deltaClass =
    delta.direction === 'up'
      ? 'font-bold text-ok'
      : delta.direction === 'down'
        ? 'font-bold text-err'
        : 'font-medium text-muted'

  const realPosLabel =
    row.realPosition !== null
      ? strings.detail.positionBadge(row.realPosition)
      : strings.detail.unclassified
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
            {row.driverName} · {row.constructorName}
          </span>
          <span className="text-[11px] tabular-nums text-muted">
            {strings.compare.inspectorTransition(
              realPosLabel,
              realPtsLabel,
              systemId,
              row.position,
              formatPoints(row.points),
            )}
          </span>
        </div>
      </div>
      <span aria-label={delta.ariaLabel} className={`shrink-0 tabular-nums ${deltaClass}`}>
        {delta.text}
      </span>
    </>
  )
}
