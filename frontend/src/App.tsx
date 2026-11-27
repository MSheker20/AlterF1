import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, Route, Routes, useLocation } from 'react-router'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SimplePage } from './components/layout/SiteChrome'
import type { Language } from './i18n'
import { useLocalizedPath } from './i18n/useLocalizedPath'

// Each page is its own chunk: the home page does not download the tower's animation library
// (motion) and only the Progression tab downloads Recharts.
const HomePage = lazy(() => import('./routes/HomePage').then((m) => ({ default: m.HomePage })))
const AboutPage = lazy(() => import('./routes/AboutPage').then((m) => ({ default: m.AboutPage })))
const SeasonLayout = lazy(() =>
  import('./components/season/SeasonLayout').then((m) => ({ default: m.SeasonLayout })),
)
const ConstructorsLayout = lazy(() =>
  import('./routes/ConstructorsPage').then((m) => ({ default: m.ConstructorsLayout })),
)
const TowerTab = lazy(() => import('./routes/SeasonPage').then((m) => ({ default: m.TowerTab })))
const CompareTab = lazy(() => import('./routes/CompareTab').then((m) => ({ default: m.CompareTab })))
const ProgressionTab = lazy(() =>
  import('./routes/ProgressionTab').then((m) => ({ default: m.ProgressionTab })),
)

function TabFallback() {
  return <div aria-busy="true" className="min-h-[440px]" />
}

function PageFallback() {
  return <div aria-busy="true" className="min-h-dvh bg-bg" />
}

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
  const { pathname } = useLocation()
  // A lazy page whose chunk fails to load (e.g. after a deploy) shows a reload prompt, not a blank page.
  return (
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  )
}

function pageRoutes() {
  return (
    <>
      <Route index element={<HomePage />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="season/:year/constructors" element={<ConstructorsLayout />}>
        <Route
          index
          element={
            <Suspense fallback={<TabFallback />}>
              <TowerTab />
            </Suspense>
          }
        />
        <Route
          path="compare"
          element={
            <Suspense fallback={<TabFallback />}>
              <CompareTab />
            </Suspense>
          }
        />
        <Route
          path="progression"
          element={
            <ErrorBoundary>
              <Suspense fallback={<TabFallback />}>
                <ProgressionTab />
              </Suspense>
            </ErrorBoundary>
          }
        />
      </Route>
      <Route path="season/:year" element={<SeasonLayout />}>
        <Route
          index
          element={
            <Suspense fallback={<TabFallback />}>
              <TowerTab />
            </Suspense>
          }
        />
        <Route
          path="compare"
          element={
            <Suspense fallback={<TabFallback />}>
              <CompareTab />
            </Suspense>
          }
        />
        <Route
          path="progression"
          element={
            <ErrorBoundary>
              <Suspense fallback={<TabFallback />}>
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
      <Route path="tr" caseSensitive element={<LanguageRoot lang="tr" />}>
        {pageRoutes()}
      </Route>
      <Route path="/" element={<LanguageRoot lang="en" />}>
        {pageRoutes()}
      </Route>
    </Routes>
  )
}

export default App
