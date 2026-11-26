import { HealthBadge } from './components/HealthBadge'

export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-16">
      <div className="mb-4 h-1 w-12 rounded-full bg-accent" aria-hidden="true" />
      <h1 className="text-4xl font-semibold tracking-tight text-text">AlterF1</h1>
      <p className="mt-3 text-base text-muted">
        What if F1 seasons were scored under a different points system?
      </p>
      <div className="mt-8">
        <HealthBadge />
      </div>
      <footer className="mt-16 border-t border-border pt-6 text-xs text-muted">
        Data:{' '}
        <a
          href="https://github.com/f1db/f1db"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-border underline-offset-4 transition-colors hover:text-text"
        >
          F1DB
        </a>{' '}
        (CC BY 4.0)
      </footer>
    </main>
  )
}

export default App
