import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, Route, Routes } from 'react-router'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SimplePage } from './components/layout/SiteChrome'
import type { Language } from './i18n'
import { useLocalizedPath } from './i18n/useLocalizedPath'
import { AboutPage } from './routes/AboutPage'
import { SeasonLayout } from './components/season/SeasonLayout'
import { CompareTab } from './routes/CompareTab'
import { HomePage } from './routes/HomePage'
import { TowerTab } from './routes/SeasonPage'

// Recharts is only needed on the Progression tab: keep it out of the first download.
const ProgressionTab = lazy(() =>
  import('./routes/ProgressionTab').then((m) => ({ default: m.ProgressionTab })),
)

function NotFoundPage() {
  const { t } = useTranslation()
  const { to } = useLocalizedPath()
  return (
    <SimplePage>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-text">{t('page.notFoundTitle')}</h1>
        <p className="mt-2 text-sm text-muted">{t('page.notFoundDetail')}</p>
        <div className="mt-6">
          <Link
            to={to('/')}
            className="inline-flex items-center rounded-md border border-border bg-surface-2 px-4 py-2 text-xs font-semibold text-text no-underline transition-colors hover:border-[#3a4250]"
          >
            {t('page.backHome')}
          </Link>
        </div>
      </main>
    </SimplePage>
  )
}

/** Keeps i18next and <html lang> in step with the URL: English at /…, Turkish at /tr/…. */
function LanguageRoot({ lang }: { lang: Language }) {
  const { i18n } = useTranslation()
  useEffect(() => {
    if (i18n.resolvedLanguage !== lang) {
      void i18n.changeLanguage(lang)
    }
    document.documentElement.lang = lang
  }, [i18n, lang])
  return <Outlet />
}

function pageRoutes() {
  return (
    <>
      <Route index element={<HomePage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="season/:year" element={<SeasonLayout />}>
        <Route index element={<TowerTab />} />
        <Route path="compare" element={<CompareTab />} />
        <Route
          path="progression"
          element={
            <ErrorBoundary>
              <Suspense fallback={<div aria-busy="true" className="min-h-[440px]" />}>
                <ProgressionTab />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="tr" element={<LanguageRoot lang="tr" />}>
        {pageRoutes()}
      </Route>
      <Route path="/" element={<LanguageRoot lang="en" />}>
        {pageRoutes()}
      </Route>
    </Routes>
  )
}

export default App
