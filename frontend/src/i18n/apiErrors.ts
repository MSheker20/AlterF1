import type { TFunction } from 'i18next'
import type { ApiError } from '../api/client'
import type { Language } from './index'

/** Query parameters the API can name in a 400 (its "field" property); each has a translated message. */
export const SERVER_ERROR_FIELDS = [
  'custom',
  'customFl',
  'customSprint',
  'customBest',
  'exclude',
  'skip',
  'sprint',
  'fl',
  'preset',
  'system',
] as const

export type ServerErrorField = (typeof SERVER_ERROR_FIELDS)[number]

export function isServerErrorField(field: string | undefined): field is ServerErrorField {
  return field !== undefined && (SERVER_ERROR_FIELDS as readonly string[]).includes(field)
}

/** A 400's message: the server's English detail in English, a translated one in Turkish. */
export function badRequestMessage(t: TFunction, lang: Language, error: ApiError): string {
  if (lang === 'en') {
    return error.detail || error.title
  }
  return isServerErrorField(error.field)
    ? t(`serverErrors.${error.field}`)
    : t('serverErrors.generic')
}

/** Title and detail for an API error page or banner, in the page's language. */
export function apiErrorText(
  t: TFunction,
  lang: Language,
  error: ApiError,
): { title: string; detail: string } {
  if (lang === 'en') {
    return { title: error.title, detail: error.detail }
  }
  if (error.status === 404) {
    return { title: t('page.invalidSeasonTitle'), detail: '' }
  }
  if (error.status === 400) {
    return { title: t('serverErrors.generic'), detail: badRequestMessage(t, lang, error) }
  }
  return { title: t('page.genericErrorTitle'), detail: t('page.genericErrorDetail') }
}
