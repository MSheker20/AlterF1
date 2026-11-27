import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { switchLanguagePath } from '../../i18n'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'
import { HealthBadge } from '../HealthBadge'

/** The AlterF1 word mark; always leads back to the home page. */
export function BrandLink() {
  const { t } = useTranslation()
  const { to } = useLocalizedPath()
  return (
    <Link
      to={to('/')}
      className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-text no-underline transition-opacity hover:opacity-90"
    >
      <span aria-hidden="true" className="h-5 w-1 rounded-[2px] bg-accent" />
      <span>{t('brand')}</span>
    </Link>
  )
}

/** The same page in the other language (EN at /…, TR at /tr/…), keeping the query string. */
export function LanguageSwitch() {
  const { t } = useTranslation()
  const { lang } = useLocalizedPath()
  const location = useLocation()
  const target = lang === 'tr' ? 'en' : 'tr'
  return (
    <Link
      to={`${switchLanguagePath(location.pathname, target)}${location.search}`}
      hrefLang={target}
      lang={target}
      aria-label={t('lang.switchAria')}
      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-muted no-underline transition-colors hover:border-[#363d48] hover:text-text"
    >
      {t('lang.switchLabel')}
    </Link>
  )
}

export function AboutLink() {
  const { t } = useTranslation()
  const { to } = useLocalizedPath()
  return (
    <Link
      to={to('/about')}
      className="text-xs font-semibold text-muted no-underline transition-colors hover:text-text sm:text-[13px]"
    >
      {t('nav.about')}
    </Link>
  )
}

/** Footer with the F1DB attribution required by its CC BY 4.0 licence. */
export function SiteFooter({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <footer className={`border-t border-border ${className}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-muted sm:px-6">
        <p className="m-0">
          {t('footer.dataPrefix')}
          <a
            href="https://github.com/f1db/f1db"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-border underline-offset-4 transition-colors hover:text-text"
          >
            {t('footer.f1dbName')}
          </a>
          {t('footer.licenseSuffix')}
        </p>
        <HealthBadge />
      </div>
    </footer>
  )
}

/** Header + main + footer for pages outside a season. */
export function SimplePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLink />
          <nav className="flex items-center gap-4">
            <AboutLink />
            <LanguageSwitch />
          </nav>
        </div>
      </header>
      {children}
      <SiteFooter />
    </div>
  )
}
