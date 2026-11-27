import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import tr from './tr.json'

export type Language = 'en' | 'tr'

export const LANGUAGES: readonly Language[] = ['en', 'tr']

/** English lives at /…, Turkish at /tr/… (PLAN.md §2b). */
export function languageFromPath(pathname: string): Language {
  return pathname === '/tr' || pathname.startsWith('/tr/') ? 'tr' : 'en'
}

/** Prefix an app path ("/season/1988?system=1991") for a language. */
export function localizePath(path: string, lang: Language): string {
  if (lang === 'en') {
    return path
  }
  return path === '/' ? '/tr' : `/tr${path}`
}

/** The same page in the other language: strips or adds the /tr prefix. */
export function switchLanguagePath(pathname: string, target: Language): string {
  const bare = languageFromPath(pathname) === 'tr' ? pathname.slice(3) || '/' : pathname
  return localizePath(bare, target)
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, tr: { translation: tr } },
  lng: typeof window === 'undefined' ? 'en' : languageFromPath(window.location.pathname),
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
