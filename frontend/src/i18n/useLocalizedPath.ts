import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { localizePath } from './index'
import type { Language } from './index'

/** Current language and a helper that prefixes app paths with /tr when needed. */
export function useLocalizedPath() {
  const { i18n } = useTranslation()
  const lang: Language = i18n.resolvedLanguage === 'tr' ? 'tr' : 'en'
  const to = useCallback((path: string) => localizePath(path, lang), [lang])
  return { lang, to }
}
