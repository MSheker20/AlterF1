import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { MultiplierPreset, RulesSummary } from '../../api/types'
import type { Scenario } from '../../lib/scenario'

interface ScenarioSwitchProps {
  label: string
  checked: boolean
  disabled?: boolean
  hint?: string
  onChange: (checked: boolean) => void
}

export function ScenarioSwitch({
  label,
  checked,
  disabled = false,
  hint,
  onChange,
}: ScenarioSwitchProps) {
  const labelId = useId()
  const hintId = useId()

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span
          id={labelId}
          onClick={() => {
            if (!disabled) {
              onChange(!checked)
            }
          }}
          className={`text-xs font-medium select-none ${
            disabled ? 'cursor-not-allowed text-muted/70' : 'cursor-pointer text-text'
          }`}
        >
          {label}
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={labelId}
          aria-describedby={hint ? hintId : undefined}
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              onChange(!checked)
            }
          }}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
            checked
              ? 'border-accent bg-accent'
              : 'border-border bg-surface-2 hover:border-[#3d4552]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-text shadow-sm transition-transform ${
              checked ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {hint && (
        <p id={hintId} className="m-0 text-[11px] leading-snug text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}

interface BonusesAndPresetSectionProps {
  scenario: Scenario
  rules: RulesSummary | null
  onChangeSprint: (enabled: boolean) => void
  onChangeFastestLap: (enabled: boolean) => void
  onChangePreset: (preset: MultiplierPreset) => void
  bonusesError?: string | null
  presetError?: string | null
}

const PRESET_OPTIONS = [
  {
    value: 'historical',
    labelKey: 'scenario.presetHistorical',
    helpKey: 'scenario.presetHistoricalHelp',
  },
  {
    value: 'pure',
    labelKey: 'scenario.presetPure',
    helpKey: 'scenario.presetPureHelp',
  },
  {
    value: 'all',
    labelKey: 'scenario.presetAll',
    helpKey: 'scenario.presetAllHelp',
  },
] as const satisfies readonly {
  value: MultiplierPreset
  labelKey: 'scenario.presetHistorical' | 'scenario.presetPure' | 'scenario.presetAll'
  helpKey: 'scenario.presetHistoricalHelp' | 'scenario.presetPureHelp' | 'scenario.presetAllHelp'
}[]

export function BonusesAndPresetSection({
  scenario,
  rules,
  onChangeSprint,
  onChangeFastestLap,
  onChangePreset,
  bonusesError = null,
  presetError = null,
}: BonusesAndPresetSectionProps) {
  const { t } = useTranslation()
  const flDisabled = scenario.fl && rules !== null && rules.fastestLap === null
  const flHint = flDisabled
    ? scenario.system === 'custom'
      ? t('scenario.noFastestLapCustomHint')
      : t('scenario.noFastestLapHint')
    : undefined

  const activePreset =
    PRESET_OPTIONS.find((option) => option.value === scenario.preset) ?? PRESET_OPTIONS[0]

  return (
    <>
      <fieldset className="m-0 space-y-2.5 border-0 p-0">
        <legend className="mb-2 p-0 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          {t('scenario.bonusesLegend')}
        </legend>

        <div className="space-y-3 rounded-md border border-border bg-bg p-3">
          <ScenarioSwitch
            label={t('scenario.scoreSprintsLabel')}
            checked={scenario.sprint}
            onChange={onChangeSprint}
          />

          <div className="border-t border-border/70 pt-3">
            <ScenarioSwitch
              label={t('scenario.fastestLapLabel')}
              checked={flDisabled ? false : scenario.fl}
              disabled={flDisabled}
              hint={flHint}
              onChange={(enabled) => {
                if (!flDisabled) {
                  onChangeFastestLap(enabled)
                }
              }}
            />
          </div>
        </div>

        {bonusesError && (
          <p role="alert" className="mt-1.5 text-xs text-err">
            {bonusesError}
          </p>
        )}
      </fieldset>

      <fieldset className="m-0 space-y-2 border-0 p-0">
        <legend className="mb-2 p-0 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          {t('scenario.multipliersLegend')}
        </legend>

        <div
          role="group"
          aria-label={t('scenario.multipliersLegend')}
          className="grid grid-cols-3 gap-0.5 rounded-lg border border-border bg-bg p-[3px]"
        >
          {PRESET_OPTIONS.map((option) => {
            const isActive = scenario.preset === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                title={t(option.helpKey)}
                onClick={() => {
                  if (!isActive) {
                    onChangePreset(option.value)
                  }
                }}
                className={`h-8 cursor-pointer rounded-[6px] px-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-surface-2 text-text ring-1 ring-inset ring-[#363d48]'
                    : 'text-muted hover:text-text'
                }`}
              >
                {t(option.labelKey)}
              </button>
            )
          })}
        </div>

        <p aria-live="polite" className="m-0 text-[11px] leading-snug text-muted">
          {t(activePreset.helpKey)}
        </p>

        {presetError && (
          <p role="alert" className="mt-1.5 text-xs text-err">
            {presetError}
          </p>
        )}
      </fieldset>
    </>
  )
}
