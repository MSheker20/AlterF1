import type { TFunction } from 'i18next'
import i18n from '../i18n'

export type DeltaDirection = 'up' | 'down' | 'same'

export interface DeltaInfo {
  text: string
  ariaLabel: string
  direction: DeltaDirection
}

/** Points with at most two decimals and a decimal point, for URLs and inputs ("1.5"). */
export function formatPointsPlain(points: number): string {
  if (!Number.isFinite(points)) {
    return '0'
  }
  const rounded = Math.round((points + Math.sign(points) * Number.EPSILON) * 100) / 100
  const normalized = Object.is(rounded, -0) ? 0 : rounded
  return normalized
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')
}

/** Points for display: a decimal comma in Turkish ("1,5"). */
export function formatPoints(points: number): string {
  const plain = formatPointsPlain(points)
  return i18n.resolvedLanguage === 'tr' ? plain.replace('.', ',') : plain
}

export function deltaLabel(t: TFunction, positionChange: number | null): DeltaInfo {
  if (positionChange === null || positionChange === 0) {
    return {
      text: '—',
      ariaLabel: t('delta.unchanged'),
      direction: 'same',
    }
  }

  if (positionChange > 0) {
    return {
      text: `▲${positionChange}`,
      ariaLabel: t('delta.gained', { count: positionChange }),
      direction: 'up',
    }
  }

  const lost = Math.abs(positionChange)
  return {
    text: `▼${lost}`,
    ariaLabel: t('delta.lost', { count: lost }),
    direction: 'down',
  }
}

export function getSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : fullName.trim()
}

export function fallbackDriverCode(driverCode: string, driverName: string): string {
  const trimmed = driverCode.trim()
  if (trimmed.length > 0) {
    return trimmed.toUpperCase()
  }
  return getSurname(driverName).replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'DRV'
}
