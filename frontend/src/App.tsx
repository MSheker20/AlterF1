import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SimplePage } from './components/layout/SiteChrome'
import { SeasonLayout } from './components/season/SeasonLayout'
import { strings } from './i18n/strings'
import { CompareTab } from './routes/CompareTab'
import { HomePage } from './routes/HomePage'
import { TowerTab } from './routes/SeasonPage'

// Recharts is only needed on the Progression tab: keep it out of the first download.
const ProgressionTab = lazy(() =>
  import('./routes/ProgressionTab').then((m) => ({ default: m.ProgressionTab })),
)

function NotFoundPage() {
  return (
    <SimplePage>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          {strings.page.notFoundTitle}
        </h1>
        <p className="mt-2 text-sm text-muted">{strings.page.notFoundDetail}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center rounded-md border border-border bg-surface-2 px-4 py-2 text-xs font-semibold text-text no-underline transition-colors hover:border-[#3a4250]"
          >
            {strings.page.backHome}
          </Link>
        </div>
      </main>
    </SimplePage>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/season/:year" element={<SeasonLayout />}>
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
    </Routes>
  )
}

export default App
