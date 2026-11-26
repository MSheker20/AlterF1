import { useEffect, useState } from 'react'
import { fetchHealth, type Health } from '../api/health'

type HealthState =
  | { kind: 'loading' }
  | { kind: 'ok'; health: Health }
  | { kind: 'error'; message: string }

export function HealthBadge() {
  const [state, setState] = useState<HealthState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetchHealth(controller.signal)
      .then((health) => {
        if (!controller.signal.aborted) {
          setState({ kind: 'ok', health })
        }
      })
      .catch((err: unknown) => {
        if (
          controller.signal.aborted ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          return
        }
        const message = err instanceof Error ? err.message : 'Unknown error'
        setState({ kind: 'error', message })
      })

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <div
      role="status"
      aria-live="polite"
      title={state.kind === 'error' ? state.message : undefined}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted"
    >
      {state.kind === 'loading' && (
        <>
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-muted animate-pulse"
          />
          <span>Checking backend…</span>
        </>
      )}
      {state.kind === 'ok' && (
        <>
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ok" />
          <span>Backend UP · v{state.health.version}</span>
        </>
      )}
      {state.kind === 'error' && (
        <>
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-err" />
          <span>Backend unreachable</span>
        </>
      )}
    </div>
  )
}
