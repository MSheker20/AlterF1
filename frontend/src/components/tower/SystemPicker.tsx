import { useTranslation } from 'react-i18next'
import type { BuiltinSystemId, ScoringSystem, SystemId } from '../../api/types'
import { BUILTIN_SYSTEM_IDS } from '../../lib/scenario'

interface SystemPickerProps {
  systems: readonly ScoringSystem[]
  selectedSystem: string
  realSystem: string | null
  onChange: (systemId: SystemId) => void
  disabled?: boolean
}

export function SystemPicker({
  systems,
  selectedSystem,
  realSystem,
  onChange,
  disabled = false,
}: SystemPickerProps) {
  const { t } = useTranslation()
  const builtinIds: readonly BuiltinSystemId[] =
    systems.length > 0 ? systems.map((s) => s.id) : BUILTIN_SYSTEM_IDS
  const systemIds: readonly SystemId[] = [...builtinIds, 'custom']

  return (
    <div
      role="group"
      aria-label={t('controls.scoringSystemLabel')}
      className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-surface p-[3px]"
    >
      {systemIds.map((systemId) => {
        const isActive = systemId === selectedSystem
        const isReal = realSystem === systemId
        const label = systemId === 'custom' ? t('controls.customSystemLabel') : systemId

        return (
          <button
            key={systemId}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            title={isReal ? t('controls.realSystemTooltip') : undefined}
            onClick={() => {
              if (!isActive) {
                onChange(systemId)
              }
            }}
            className={`relative inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5 text-xs font-semibold tabular-nums transition-colors sm:px-3 sm:text-[13px] ${
              isActive
                ? 'bg-surface-2 text-text ring-1 ring-inset ring-[#363d48]'
                : 'text-muted hover:text-text'
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span>{label}</span>
            {isReal && (
              <>
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                />
                <span className="sr-only"> ({t('controls.realSystemSrOnly')})</span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
