import type { TFunction } from 'i18next'

/** Display name of a points system id: "1991", or the translated "Custom". */
export function systemLabel(t: TFunction, systemId: string): string {
  return systemId === 'custom' ? t('common.custom') : systemId
}

/** i18next context for keys that have a "_custom" variant. */
export function systemContext(systemId: string): 'custom' | undefined {
  return systemId === 'custom' ? 'custom' : undefined
}
