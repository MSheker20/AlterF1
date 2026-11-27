import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { ProgressionDriver, ProgressionResponse } from '../../api/types'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { systemContext, systemLabel } from '../../i18n/system'
import { fallbackDriverCode, formatPoints, getSurname } from '../../lib/format'
import {
  DEFAULT_VISIBLE_LIMIT,
  computeLineStyles,
  defaultVisible,
  toChartRows,
} from '../../lib/progression'
import type { DriverLineStyle, ProgressionChartRow } from '../../lib/progression'
import { teamColor } from '../../lib/teamColors'

const DEFAULT_LINE_STYLE: DriverLineStyle = { color: '#9aa1ab', dashArray: undefined }
const DEFAULT_DOT_STYLE = { r: 2.5, strokeWidth: 0, fill: DEFAULT_LINE_STYLE.color }
const DEFAULT_ACTIVE_DOT_STYLE = {
  r: 5,
  stroke: '#0b0d10',
  strokeWidth: 1.5,
  fill: DEFAULT_LINE_STYLE.color,
}

interface ProgressionChartProps {
  data: ProgressionResponse
  realChampionId: string | null
  isDesktop: boolean
  scenarioKey: string
}

export function ProgressionChart({
  data,
  realChampionId,
  isDesktop,
  scenarioKey,
}: ProgressionChartProps) {
  const { t } = useTranslation()
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const resetScope = `${data.season}:${data.system}:${scenarioKey}`
  const [prevScope, setPrevScope] = useState(resetScope)
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null)
  if (resetScope !== prevScope) {
    setPrevScope(resetScope)
    setSelectedIds(null)
  }

  const activeVisibleIds = useMemo(() => {
    if (selectedIds === null) {
      return defaultVisible(data, realChampionId)
    }
    const validIds = new Set(data.drivers.map((driver) => driver.driverId))
    return selectedIds.filter((id) => validIds.has(id))
  }, [data, realChampionId, selectedIds])

  const visibleSet = useMemo(() => new Set(activeVisibleIds), [activeVisibleIds])
  const chartRows = useMemo(() => toChartRows(data), [data])
  const lineStyles = useMemo(
    () => computeLineStyles(data.drivers, visibleSet),
    [data.drivers, visibleSet],
  )

  const driverById = useMemo(() => {
    const map = new Map<string, ProgressionDriver>()
    for (const driver of data.drivers) {
      map.set(driver.driverId, driver)
    }
    return map
  }, [data.drivers])

  const raceCodeByRound = useMemo(() => {
    const map = new Map<number, string>()
    for (const race of data.races) {
      map.set(race.round, race.code)
    }
    return map
  }, [data.races])

  const yAxisDomain = useMemo<[number, number]>(() => {
    let max = 0
    for (const driver of data.drivers) {
      for (const pts of driver.points) {
        if (Number.isFinite(pts) && pts > max) {
          max = pts
        }
      }
    }
    return [0, max > 0 ? max : 1]
  }, [data.drivers])

  const lineDotStyles = useMemo(() => {
    const map = new Map<
      string,
      {
        dot: { r: number; strokeWidth: number; fill: string }
        activeDot: { r: number; stroke: string; strokeWidth: number; fill: string }
      }
    >()
    for (const driver of data.drivers) {
      const color = teamColor(driver.constructorId)
      map.set(driver.driverId, {
        dot: { r: 2.5, strokeWidth: 0, fill: color },
        activeDot: { r: 5, stroke: '#0b0d10', strokeWidth: 1.5, fill: color },
      })
    }
    return map
  }, [data.drivers])

  const visibleDrivers = useMemo(
    () => data.drivers.filter((driver) => visibleSet.has(driver.driverId)),
    [data.drivers, visibleSet],
  )

  const clinchIndex = useMemo(
    () =>
      data.clinch !== null
        ? data.races.findIndex((race) => race.round === data.clinch?.round)
        : -1,
    [data.clinch, data.races],
  )

  const clinchSentence = useMemo(() => {
    if (data.races.length === 0) {
      return null
    }
    if (data.clinch === null) {
      return t('progression.finalRaceSentence')
    }
    const clincher = driverById.get(data.clinch.driverId)
    const surname = clincher ? getSurname(clincher.driverName) : data.clinch.driverId
    const racesRemaining =
      clinchIndex >= 0 ? Math.max(0, data.races.length - 1 - clinchIndex) : 0
    return racesRemaining > 0
      ? t('progression.clinchedSentence', {
          surname,
          round: data.clinch.round,
          code: data.clinch.code,
          count: racesRemaining,
        })
      : t('progression.clinchedAtRound', {
          surname,
          round: data.clinch.round,
          code: data.clinch.code,
        })
  }, [clinchIndex, data.clinch, data.races, driverById, t])

  if (data.races.length === 0 || data.drivers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        {t('progression.empty')}
      </div>
    )
  }

  function handleToggleDriver(driverId: string) {
    setSelectedIds((prev) => {
      const current = prev ?? defaultVisible(data, realChampionId)
      if (current.includes(driverId)) {
        return current.filter((id) => id !== driverId)
      }
      return [...current, driverId]
    })
  }

  function handleSelectTop5() {
    setSelectedIds(
      data.drivers.slice(0, DEFAULT_VISIBLE_LIMIT).map((driver) => driver.driverId),
    )
  }

  function handleClear() {
    setSelectedIds([])
  }

  const rotateTicks = !isDesktop && data.races.length > 8
  const clinchLabelPosition =
    clinchIndex >= 0 && clinchIndex >= data.races.length - 2
      ? 'insideTopLeft'
      : 'insideTopRight'

  return (
    <section aria-label={t('progression.sectionAriaLabel')} className="space-y-4">
      {clinchSentence !== null && (
        <p className="m-0 text-sm font-medium text-text tabular-nums">{clinchSentence}</p>
      )}

      <div className="rounded-lg border border-border bg-surface p-3 sm:p-4">
        {visibleDrivers.length === 0 && (
          <p className="mb-2 text-center text-xs text-muted">
            {t('progression.noDriversSelected')}
          </p>
        )}

        <div aria-hidden="true" className="h-[360px] w-full lg:h-[440px]">
          <LineChart
            responsive
            accessibilityLayer={false}
            data={chartRows}
            style={{ width: '100%', height: '100%' }}
            margin={{
              top: 18,
              right: 16,
              left: 0,
              bottom: rotateTicks ? 24 : 8,
            }}
          >
            <CartesianGrid stroke="#262b33" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="round"
              type="category"
              tickFormatter={(value: number | string) =>
                raceCodeByRound.get(Number(value)) ?? String(value)
              }
              stroke="#9aa1ab"
              angle={rotateTicks ? -45 : 0}
              tick={{
                fill: '#9aa1ab',
                fontSize: rotateTicks ? 10 : 11,
                textAnchor: rotateTicks ? 'end' : 'middle',
              }}
              tickLine={false}
              axisLine={{ stroke: '#262b33' }}
              minTickGap={rotateTicks ? 2 : 8}
              height={rotateTicks ? 48 : 30}
            />
            <YAxis
              domain={yAxisDomain}
              stroke="#9aa1ab"
              tick={{ fill: '#9aa1ab', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={(value: number | string) => formatPoints(Number(value))}
            />
            <Tooltip
              isAnimationActive={!prefersReducedMotion}
              cursor={{ stroke: '#3a4250', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={(tooltipProps) => (
                <ProgressionTooltip
                  tooltipProps={tooltipProps}
                  driverById={driverById}
                  lineStyles={lineStyles}
                  raceCodeByRound={raceCodeByRound}
                />
              )}
            />

            {data.clinch !== null && (
              <ReferenceLine
                x={data.clinch.round}
                stroke="#e10600"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: t('progression.decidedLabel'),
                  position: clinchLabelPosition,
                  fill: '#e10600',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            )}

            {visibleDrivers.map((driver) => {
              const style = lineStyles.get(driver.driverId) ?? DEFAULT_LINE_STYLE
              const dotStyle = lineDotStyles.get(driver.driverId)

              return (
                <Line
                  key={driver.driverId}
                  type="linear"
                  dataKey={driver.driverId}
                  name={fallbackDriverCode(driver.driverCode, driver.driverName)}
                  stroke={style.color}
                  strokeWidth={2}
                  strokeDasharray={style.dashArray}
                  dot={dotStyle?.dot ?? DEFAULT_DOT_STYLE}
                  activeDot={dotStyle?.activeDot ?? DEFAULT_ACTIVE_DOT_STYLE}
                  isAnimationActive={!prefersReducedMotion}
                  connectNulls={false}
                />
              )
            })}
          </LineChart>
        </div>

        <table className="sr-only">
          <caption>
            {t('progression.srTableCaption', {
              context: systemContext(data.system),
              season: data.season,
              system: systemLabel(t, data.system),
            })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('progression.srDriverColumn')}</th>
              {data.races.map((race) => (
                <th key={race.round} scope="col">
                  {t('progression.tooltipRound', { round: race.round, code: race.code })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleDrivers.map((driver) => (
              <tr key={driver.driverId}>
                <th scope="row">{driver.driverName}</th>
                {data.races.map((race, raceIndex) => (
                  <td key={race.round}>{formatPoints(driver.points[raceIndex] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2.5 rounded-lg border border-border bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
              {t('progression.driversLabel')}
            </span>
            <span className="text-xs tabular-nums text-muted">
              {t('progression.shownCount', { count: visibleDrivers.length })}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectTop5}
              className="cursor-pointer rounded-md border border-border bg-surface-2 px-2.5 py-1 text-xs font-semibold text-text transition-colors hover:border-[#3a4250]"
            >
              {t('progression.top5Button')}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={visibleDrivers.length === 0}
              className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-[#3a4250] hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t('progression.clearButton')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {data.drivers.map((driver) => {
            const isVisible = visibleSet.has(driver.driverId)
            const style = lineStyles.get(driver.driverId) ?? {
              color: '#9aa1ab',
              dashArray: undefined,
            }
            const code = fallbackDriverCode(driver.driverCode, driver.driverName)
            const finalPoints =
              driver.points.length > 0 ? driver.points[driver.points.length - 1] : 0

            return (
              <button
                key={driver.driverId}
                type="button"
                aria-pressed={isVisible}
                title={driver.driverName}
                onClick={() => handleToggleDriver(driver.driverId)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                  isVisible
                    ? 'border-[#3a4250] bg-surface-2 text-text'
                    : 'border-border bg-bg text-muted opacity-55 hover:opacity-85'
                }`}
              >
                <svg
                  aria-hidden="true"
                  width="16"
                  height="6"
                  viewBox="0 0 16 6"
                  className="shrink-0"
                >
                  <line
                    x1="0"
                    y1="3"
                    x2="16"
                    y2="3"
                    stroke={style.color}
                    strokeWidth="2.5"
                    strokeDasharray={style.dashArray}
                  />
                </svg>
                <span className="font-bold uppercase tracking-[0.06em]">{code}</span>
                <span className="sr-only"> ({driver.driverName})</span>
                <span className="tabular-nums text-muted">{formatPoints(finalPoints)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

interface ProgressionTooltipProps {
  tooltipProps: TooltipContentProps
  driverById: ReadonlyMap<string, ProgressionDriver>
  lineStyles: ReadonlyMap<string, DriverLineStyle>
  raceCodeByRound: ReadonlyMap<number, string>
}

function ProgressionTooltip({
  tooltipProps,
  driverById,
  lineStyles,
  raceCodeByRound,
}: ProgressionTooltipProps) {
  const { t } = useTranslation()
  const { active, payload, label } = tooltipProps
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const row = payload[0]?.payload as ProgressionChartRow | undefined
  const roundFromLabel =
    typeof label === 'number'
      ? label
      : typeof label === 'string' && label !== '' && Number.isFinite(Number(label))
        ? Number(label)
        : null
  const round = typeof row?.round === 'number' ? row.round : roundFromLabel
  const raceCode =
    (round !== null ? raceCodeByRound.get(round) : undefined) ??
    (typeof row?.race === 'string' ? row.race : String(label ?? ''))

  const items = payload
    .filter(
      (entry) =>
        !entry.hide && typeof entry.value === 'number' && Number.isFinite(entry.value),
    )
    .map((entry) => {
      const driverId = typeof entry.dataKey === 'string' ? entry.dataKey : ''
      const driver = driverById.get(driverId)
      const style = lineStyles.get(driverId)
      const code = driver
        ? fallbackDriverCode(driver.driverCode, driver.driverName)
        : String(entry.name ?? driverId)
      return {
        driverId,
        code,
        value: entry.value as number,
        position: driver?.position ?? Number.POSITIVE_INFINITY,
        color: style?.color ?? entry.color ?? '#e8eaed',
        dashArray: style?.dashArray,
      }
    })
    .sort((a, b) => {
      if (b.value !== a.value) {
        return b.value - a.value
      }
      return a.position - b.position
    })

  if (items.length === 0) {
    return null
  }

  return (
    <div className="min-w-[152px] rounded-lg border border-border bg-surface/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      <p className="mb-1.5 border-b border-border/80 pb-1 text-[11px] font-bold uppercase tracking-[0.06em] tabular-nums text-muted">
        {round !== null ? t('progression.tooltipRound', { round, code: raceCode }) : raceCode}
      </p>
      <ul className="m-0 list-none space-y-1 p-0">
        {items.map((item) => (
          <li
            key={item.driverId || item.code}
            className="flex items-center justify-between gap-4 tabular-nums"
          >
            <span className="inline-flex items-center gap-1.5">
              <svg
                aria-hidden="true"
                width="12"
                height="6"
                viewBox="0 0 12 6"
                className="shrink-0"
              >
                <line
                  x1="0"
                  y1="3"
                  x2="12"
                  y2="3"
                  stroke={item.color}
                  strokeWidth="2.5"
                  strokeDasharray={item.dashArray}
                />
              </svg>
              <span className="font-bold uppercase tracking-[0.06em] text-text">
                {item.code}
              </span>
            </span>
            <span className="font-semibold text-text">{formatPoints(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
