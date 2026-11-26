import { Link, Navigate, Route, Routes } from 'react-router'
import { HealthBadge } from './components/HealthBadge'
import { strings } from './i18n/strings'
import { SeasonPage } from './routes/SeasonPage'

function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3 sm:px-6">
          <Link
            to="/season/1988?system=1991"
            className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-text no-underline"
          >
            <span aria-hidden="true" className="h-5 w-1 rounded-[2px] bg-accent" />
            <span>{strings.brand}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          {strings.page.notFoundTitle}
        </h1>
        <p className="mt-2 text-sm text-muted">{strings.page.notFoundDetail}</p>
        <div className="mt-6">
          <Link
            to="/season/1988?system=1991"
            className="inline-flex items-center rounded-md border border-border bg-surface-2 px-4 py-2 text-xs font-semibold text-text no-underline transition-colors hover:border-[#3a4250]"
          >
            {strings.page.backToDefaultSeason}
          </Link>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-muted sm:px-6">
          <p className="m-0">
            {strings.footer.dataPrefix}
            <a
              href="https://github.com/f1db/f1db"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-border underline-offset-4 transition-colors hover:text-text"
            >
              {strings.footer.f1dbName}
            </a>
            {strings.footer.licenseSuffix}
          </p>
          <HealthBadge />
        </div>
      </footer>
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/season/1988?system=1991" replace />} />
      <Route path="/season/:year" element={<SeasonPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
