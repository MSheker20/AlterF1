import { useEffect, useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import type {
  CustomSystemConfig,
  EntrantSummary,
  MultiplierPreset,
  RaceSummary,
  RulesSummary,
} from '../../api/types'
import {
  createDefaultCustomConfig,
  customFromRules,
  defaultSystemForYear,
  isDefaultScenario,
} from '../../lib/scenario'
import type { Scenario } from '../../lib/scenario'
import { BonusesAndPresetSection } from './BonusesAndPresetSection'
import { CustomSystemSection } from './CustomSystemSection'
import { DriversSection } from './DriversSection'
import { RacesSection } from './RacesSection'

export interface ScenarioInlineErrors {
  general?: string | null
  drivers?: string | null
  races?: string | null
  bonuses?: string | null
  preset?: string | null
  customPoints?: string | null
  customFl?: string | null
  customSprint?: string | null
  customBest?: string | null
}

interface ScenarioPanelProps {
  open: boolean
  isDesktop: boolean
  season: number
  scenario: Scenario
  entrants: readonly EntrantSummary[]
  races: readonly RaceSummary[]
  rules: RulesSummary | null
  restoreFocusRef?: RefObject<HTMLButtonElement | null>
  inlineErrors?: ScenarioInlineErrors
  onChangeScenario: (updater: (prev: Scenario) => Scenario) => void
  onReset: () => void
  onClose: () => void
}

const PANEL_EASE = [0.2, 0.8, 0.2, 1] as const
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

async function copyUrlToClipboard(url: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      return false
    }
  }

  if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const textarea = document.createElement('textarea')
    textarea.value = url
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(0, url.length)
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    } finally {
      document.body.removeChild(textarea)
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
    return ok
  }

  return false
}

export function ScenarioPanel({
  open,
  isDesktop,
  season,
  scenario,
  entrants,
  races,
  rules,
  restoreFocusRef,
  inlineErrors = {},
  onChangeScenario,
  onReset,
  onClose,
}: ScenarioPanelProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const copyStatusId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const wasOpenRef = useRef(false)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const copyTimerRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [failedCopyUrl, setFailedCopyUrl] = useState<string | null>(null)
  const [resetNonce, setResetNonce] = useState(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false
        const previous = previousActiveElementRef.current
        previousActiveElementRef.current = null
        if (previous && previous.isConnected) {
          previous.focus()
        } else {
          restoreFocusRef?.current?.focus()
        }
      }
      return
    }

    const justOpened = !wasOpenRef.current
    wasOpenRef.current = true
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (justOpened) {
      const active = document.activeElement
      previousActiveElementRef.current =
        active instanceof HTMLElement &&
        active !== document.body &&
        !dialogRef.current?.contains(active)
          ? active
          : null
      closeButtonRef.current?.focus({ preventScroll: true })
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !dialogRef.current.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !dialogRef.current.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose, restoreFocusRef])

  useEffect(() => {
    if (!open || !dialogRef.current) {
      return
    }
    if (!dialogRef.current.contains(document.activeElement)) {
      closeButtonRef.current?.focus({ preventScroll: true })
    }
  }, [isDesktop, open])

  function handleToggleDriver(driverId: string) {
    onChangeScenario((prev) => {
      const exists = prev.exclude.includes(driverId)
      const nextExclude = exists
        ? prev.exclude.filter((id) => id !== driverId)
        : [...prev.exclude, driverId]
      return { ...prev, exclude: nextExclude }
    })
  }

  function handleToggleRace(round: number) {
    onChangeScenario((prev) => {
      const exists = prev.skip.includes(round)
      const nextSkip = exists
        ? prev.skip.filter((r) => r !== round)
        : [...prev.skip, round].sort((a, b) => a - b)
      return { ...prev, skip: nextSkip }
    })
  }

  function handleChangeSprint(enabled: boolean) {
    onChangeScenario((prev) => ({ ...prev, sprint: enabled }))
  }

  function handleChangeFastestLap(enabled: boolean) {
    onChangeScenario((prev) => ({ ...prev, fl: enabled }))
  }

  function handleChangePreset(preset: MultiplierPreset) {
    onChangeScenario((prev) => ({ ...prev, preset }))
  }

  function handleCreateFromCurrentRules() {
    if (!rules) {
      return
    }
    onChangeScenario((prev) => ({
      ...prev,
      system: 'custom',
      custom: customFromRules(rules),
    }))
  }

  function handleUpdateCustom(updater: (prev: CustomSystemConfig) => CustomSystemConfig) {
    onChangeScenario((prev) => {
      if (prev.system !== 'custom') {
        return prev
      }
      const currentCustom = prev.custom ?? createDefaultCustomConfig()
      return {
        ...prev,
        system: 'custom',
        custom: updater(currentCustom),
      }
    })
  }

  function handleReset() {
    setResetNonce((n) => n + 1)
    onReset()
  }

  async function handleCopyLink() {
    const url = window.location.href
    const ok = await copyUrlToClipboard(url)
    if (!isMountedRef.current) {
      return
    }
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = null
    }
    if (!ok) {
      setCopyState('failed')
      setFailedCopyUrl(url)
      return
    }
    setFailedCopyUrl(null)
    setCopyState('copied')
    copyTimerRef.current = window.setTimeout(() => {
      copyTimerRef.current = null
      setCopyState('idle')
    }, 2000)
  }

  const canReset = !isDefaultScenario(scenario) || scenario.system !== defaultSystemForYear(season)

  const panelMotion = isDesktop
    ? {
        initial: { x: '100%', y: 0 },
        animate: { x: 0, y: 0 },
        exit: { x: '100%', y: 0 },
      }
    : {
        initial: { x: 0, y: '100%' },
        animate: { x: 0, y: 0 },
        exit: { x: 0, y: '100%' },
      }

  const backdropClass = isDesktop
    ? 'fixed inset-x-0 bottom-0 top-[61px] z-20 bg-black/55'
    : 'fixed inset-0 z-40 bg-black/65'

  const panelClass = isDesktop
    ? 'fixed bottom-0 right-0 top-[61px] z-[25] flex w-[400px] max-w-full flex-col border-l border-border bg-surface shadow-2xl'
    : 'fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-surface shadow-2xl'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scenario-panel-backdrop"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className={backdropClass}
        />
      )}

      {open && (
        <motion.div
          key="scenario-panel"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={panelMotion.initial}
          animate={panelMotion.animate}
          exit={panelMotion.exit}
          transition={{ duration: 0.26, ease: PANEL_EASE }}
          className={panelClass}
        >
          {!isDesktop && (
            <div
              aria-hidden="true"
              className="mx-auto mb-1.5 mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border"
            />
          )}

          <div
            className={`flex items-center justify-between gap-3 border-b border-border px-4 ${
              isDesktop ? 'py-3' : 'pb-3 pt-1'
            }`}
          >
            <h2 id={titleId} className="m-0 text-base font-bold leading-tight text-text">
              {t('scenario.title')}
            </h2>

            <button
              ref={closeButtonRef}
              type="button"
              aria-label={t('scenario.closePanel')}
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface-2 text-lg leading-none text-text transition-colors hover:border-[#3d4552]"
            >
              &times;
            </button>
          </div>

          <div
            role="region"
            tabIndex={0}
            aria-label={t('scenario.panelBodyAria')}
            className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 focus-visible:outline-offset-[-2px]"
          >
            {inlineErrors.general && (
              <div
                role="alert"
                className="rounded-md border border-err/50 bg-err/10 px-3 py-2 text-xs text-err"
              >
                {inlineErrors.general}
              </div>
            )}

            <DriversSection
              entrants={entrants}
              excludedDrivers={scenario.exclude}
              onToggleDriver={handleToggleDriver}
              error={inlineErrors.drivers}
            />

            <RacesSection
              races={races}
              skippedRounds={scenario.skip}
              onToggleRace={handleToggleRace}
              error={inlineErrors.races}
            />

            <BonusesAndPresetSection
              scenario={scenario}
              rules={rules}
              onChangeSprint={handleChangeSprint}
              onChangeFastestLap={handleChangeFastestLap}
              onChangePreset={handleChangePreset}
              bonusesError={inlineErrors.bonuses}
              presetError={inlineErrors.preset}
            />

            <CustomSystemSection
              season={season}
              scenario={scenario}
              rules={rules}
              raceCount={races.length}
              resetNonce={resetNonce}
              onCreateFromCurrentRules={handleCreateFromCurrentRules}
              onUpdateCustom={handleUpdateCustom}
              pointsError={inlineErrors.customPoints}
              flError={inlineErrors.customFl}
              sprintError={inlineErrors.customSprint}
              bestError={inlineErrors.customBest}
            />
          </div>

          <div className="space-y-2 border-t border-border bg-bg/60 px-4 py-3">
            <p
              id={copyStatusId}
              aria-live="polite"
              className={copyState === 'failed' ? 'm-0 text-[11px] text-muted' : 'sr-only'}
            >
              {copyState === 'copied'
                ? t('scenario.copied')
                : copyState === 'failed'
                  ? t('scenario.copyFailed')
                  : ''}
            </p>

            {copyState === 'failed' && failedCopyUrl !== null && (
              <input
                type="text"
                readOnly
                value={failedCopyUrl}
                aria-labelledby={copyStatusId}
                onFocus={(event) => event.currentTarget.select()}
                onClick={(event) => event.currentTarget.select()}
                className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs text-text focus:border-[#3d4552]"
              />
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleCopyLink()
                }}
                className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-2 px-3 text-xs font-semibold text-text transition-colors hover:border-[#3d4552] hover:bg-[#222731]"
              >
                {copyState === 'copied' ? t('scenario.copied') : t('scenario.copyLink')}
              </button>

              <button
                type="button"
                disabled={!canReset}
                onClick={handleReset}
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-border px-3.5 text-xs font-semibold text-muted transition-colors hover:border-[#3d4552] hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t('scenario.reset')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
