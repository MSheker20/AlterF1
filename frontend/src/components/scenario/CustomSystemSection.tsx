import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CustomSprintMode, CustomSystemConfig, RulesSummary } from '../../api/types'
import { strings } from '../../i18n/strings'
import { formatPoints } from '../../lib/format'
import {
  createDefaultCustomConfig,
  customFromRules,
  validateCustomPoints,
} from '../../lib/scenario'
import type { Scenario } from '../../lib/scenario'
import { ScenarioSwitch } from './BonusesAndPresetSection'

interface CustomSystemSectionProps {
  season: number
  scenario: Scenario
  rules: RulesSummary | null
  raceCount: number
  resetNonce?: number
  onCreateFromCurrentRules: () => void
  onUpdateCustom: (updater: (prev: CustomSystemConfig) => CustomSystemConfig) => void
  pointsError?: string | null
  flError?: string | null
  sprintError?: string | null
  bestError?: string | null
}

const DEBOUNCE_MS = 400

function sameNumberArray(a: readonly number[] | null, b: readonly number[]): boolean {
  if (!a || a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

export function CustomSystemSection({
  season,
  scenario,
  rules,
  raceCount,
  resetNonce = 0,
  onCreateFromCurrentRules,
  onUpdateCustom,
  pointsError = null,
  flError = null,
  sprintError = null,
  bestError = null,
}: CustomSystemSectionProps) {
  const pointsInputId = useId()
  const pointsErrorId = useId()
  const sprintSelectId = useId()
  const sprintErrorId = useId()
  const bestCheckboxId = useId()
  const bestInputId = useId()
  const bestErrorId = useId()

  const isCustom = scenario.system === 'custom'
  const custom = scenario.custom ?? createDefaultCustomConfig()
  const canonicalPoints = custom.racePoints.map(formatPoints).join(',')
  const defaultBestCount = Math.min(11, Math.max(1, raceCount > 0 ? raceCount : 11))
  const canonicalBest = custom.bestResults !== null ? String(custom.bestResults) : ''

  const [pointsDraft, setPointsDraft] = useState(canonicalPoints)
  const [syncedPoints, setSyncedPoints] = useState(canonicalPoints)
  const [bestDraft, setBestDraft] = useState(
    canonicalBest.length > 0 ? canonicalBest : String(defaultBestCount),
  )
  const [syncedBest, setSyncedBest] = useState(canonicalBest)
  const [prevIsCustom, setPrevIsCustom] = useState(isCustom)

  if (isCustom !== prevIsCustom) {
    setPrevIsCustom(isCustom)
    if (isCustom) {
      setSyncedPoints(canonicalPoints)
      setPointsDraft(canonicalPoints)
      setSyncedBest(canonicalBest)
      setBestDraft(canonicalBest.length > 0 ? canonicalBest : String(defaultBestCount))
    }
  } else {
    if (canonicalPoints !== syncedPoints) {
      setSyncedPoints(canonicalPoints)
      const draftParsed = validateCustomPoints(pointsDraft)
      if (!sameNumberArray(draftParsed.points, custom.racePoints)) {
        setPointsDraft(canonicalPoints)
      }
    }

    if (canonicalBest !== syncedBest) {
      setSyncedBest(canonicalBest)
      if (canonicalBest.length > 0) {
        setBestDraft(canonicalBest)
      }
    }
  }

  const debounceRef = useRef<number | null>(null)
  const onUpdateCustomRef = useRef(onUpdateCustom)

  const clearPendingPointsDebounce = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }, [])

  useEffect(() => {
    onUpdateCustomRef.current = onUpdateCustom
  }, [onUpdateCustom])

  useEffect(() => {
    if (!isCustom) {
      clearPendingPointsDebounce()
    }
  }, [isCustom, clearPendingPointsDebounce])

  useEffect(() => {
    clearPendingPointsDebounce()
  }, [season, canonicalPoints, resetNonce, clearPendingPointsDebounce])

  useEffect(() => {
    return () => {
      clearPendingPointsDebounce()
    }
  }, [clearPendingPointsDebounce])

  const pointsValidation = isCustom ? validateCustomPoints(pointsDraft) : { points: null, error: null }
  const displayedPointsError = pointsValidation.error ?? pointsError

  const bestEnabled = custom.bestResults !== null
  const parsedBest = /^\d+$/.test(bestDraft.trim())
    ? Number.parseInt(bestDraft.trim(), 10)
    : Number.NaN
  const bestClientError =
    bestEnabled && (!Number.isInteger(parsedBest) || parsedBest < 1 || parsedBest > 40)
      ? strings.scenario.customBestError
      : null
  const displayedBestError = bestClientError ?? bestError

  function handleCreateFromCurrentRules() {
    clearPendingPointsDebounce()
    if (rules) {
      const fromRules = customFromRules(rules)
      const nextPoints = fromRules.racePoints.map(formatPoints).join(',')
      const nextBest = fromRules.bestResults !== null ? String(fromRules.bestResults) : ''
      setPointsDraft(nextPoints)
      setBestDraft(nextBest.length > 0 ? nextBest : String(defaultBestCount))
    }
    onCreateFromCurrentRules()
  }

  function handlePointsChange(nextRaw: string) {
    setPointsDraft(nextRaw)
    clearPendingPointsDebounce()

    const validation = validateCustomPoints(nextRaw)
    if (validation.points === null) {
      return
    }

    const nextPoints = validation.points
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      onUpdateCustomRef.current((prev) => ({
        ...prev,
        racePoints: nextPoints,
      }))
    }, DEBOUNCE_MS)
  }

  function handleBestToggle(enabled: boolean) {
    if (!enabled) {
      onUpdateCustom((prev) => ({ ...prev, bestResults: null }))
      return
    }
    const candidate =
      Number.isInteger(parsedBest) && parsedBest >= 1 && parsedBest <= 40
        ? parsedBest
        : defaultBestCount
    setBestDraft(String(candidate))
    onUpdateCustom((prev) => ({ ...prev, bestResults: candidate }))
  }

  function handleBestNumberChange(nextRaw: string) {
    setBestDraft(nextRaw)
    const trimmed = nextRaw.trim()
    if (!/^\d+$/.test(trimmed)) {
      return
    }
    const count = Number.parseInt(trimmed, 10)
    if (Number.isInteger(count) && count >= 1 && count <= 40) {
      onUpdateCustom((prev) => ({ ...prev, bestResults: count }))
    }
  }

  return (
    <fieldset className="m-0 space-y-3 border-0 p-0">
      <legend className="mb-2 p-0 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
        {strings.scenario.customLegend}
      </legend>

      <button
        type="button"
        disabled={rules === null}
        onClick={handleCreateFromCurrentRules}
        className="w-full cursor-pointer rounded-md border border-border bg-surface-2 px-3 py-2 text-left text-xs font-semibold text-text transition-colors hover:border-[#3d4552] hover:bg-[#222731] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {strings.scenario.createFromCurrentRules}
      </button>

      {isCustom && (
        <div className="space-y-3 rounded-md border border-border bg-bg p-3">
          <div>
            <label
              htmlFor={pointsInputId}
              className="mb-1 block text-xs font-medium text-text"
            >
              {strings.scenario.customPointsLabel}
            </label>
            <input
              id={pointsInputId}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={pointsDraft}
              onChange={(event) => handlePointsChange(event.target.value)}
              placeholder={strings.scenario.customPointsPlaceholder}
              aria-invalid={displayedPointsError ? true : undefined}
              aria-describedby={displayedPointsError ? pointsErrorId : undefined}
              className={`h-8 w-full rounded-md border bg-surface px-2.5 text-xs tabular-nums text-text placeholder:text-muted/60 ${
                displayedPointsError ? 'border-err' : 'border-border focus:border-[#3d4552]'
              }`}
            />
            {displayedPointsError && (
              <p id={pointsErrorId} role="alert" className="mt-1 text-xs text-err">
                {displayedPointsError}
              </p>
            )}
          </div>

          <div className="border-t border-border/70 pt-3">
            <ScenarioSwitch
              label={strings.scenario.customFlLabel}
              checked={custom.fastestLap}
              onChange={(checked) => onUpdateCustom((prev) => ({ ...prev, fastestLap: checked }))}
            />
            {flError && (
              <p role="alert" className="mt-1 text-xs text-err">
                {flError}
              </p>
            )}
          </div>

          <div className="border-t border-border/70 pt-3">
            <label
              htmlFor={sprintSelectId}
              className="mb-1 block text-xs font-medium text-text"
            >
              {strings.scenario.customSprintLabel}
            </label>
            <select
              id={sprintSelectId}
              value={custom.sprint}
              onChange={(event) =>
                onUpdateCustom((prev) => ({
                  ...prev,
                  sprint: event.target.value as CustomSprintMode,
                }))
              }
              aria-invalid={sprintError ? true : undefined}
              aria-describedby={sprintError ? sprintErrorId : undefined}
              className={`h-8 w-full cursor-pointer rounded-md border bg-surface px-2.5 text-xs text-text ${
                sprintError ? 'border-err' : 'border-border focus:border-[#3d4552]'
              }`}
            >
              <option value="none" className="bg-surface text-text">
                {strings.scenario.customSprintNone}
              </option>
              <option value="321" className="bg-surface text-text">
                {strings.scenario.customSprint321}
              </option>
              <option value="8" className="bg-surface text-text">
                {strings.scenario.customSprint8}
              </option>
            </select>
            {sprintError && (
              <p id={sprintErrorId} role="alert" className="mt-1 text-xs text-err">
                {sprintError}
              </p>
            )}
          </div>

          <div className="border-t border-border/70 pt-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={bestCheckboxId}
                className="flex cursor-pointer items-center gap-2 text-xs font-medium text-text select-none"
              >
                <input
                  id={bestCheckboxId}
                  type="checkbox"
                  checked={bestEnabled}
                  onChange={(event) => handleBestToggle(event.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-accent"
                />
                <span>{strings.scenario.customBestLabel}</span>
              </label>

              {bestEnabled && (
                <div className="flex items-center gap-1.5">
                  <label htmlFor={bestInputId} className="sr-only">
                    {strings.scenario.customBestNumberLabel}
                  </label>
                  <input
                    id={bestInputId}
                    type="number"
                    min={1}
                    max={40}
                    step={1}
                    value={bestDraft}
                    onChange={(event) => handleBestNumberChange(event.target.value)}
                    aria-invalid={displayedBestError ? true : undefined}
                    aria-describedby={displayedBestError ? bestErrorId : undefined}
                    className={`h-8 w-16 rounded-md border bg-surface px-2 text-right text-xs tabular-nums text-text ${
                      displayedBestError ? 'border-err' : 'border-border focus:border-[#3d4552]'
                    }`}
                  />
                </div>
              )}
            </div>

            {displayedBestError && (
              <p id={bestErrorId} role="alert" className="mt-1 text-xs text-err">
                {displayedBestError}
              </p>
            )}
          </div>
        </div>
      )}
    </fieldset>
  )
}
