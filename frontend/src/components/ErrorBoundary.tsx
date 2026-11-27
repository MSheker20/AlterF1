import { Component } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

function ErrorBoundaryFallback() {
  const { t } = useTranslation()

  return (
    <div
      role="alert"
      className="rounded-lg border border-border border-l-[3px] border-l-err bg-surface p-5"
    >
      <p className="m-0 text-sm font-semibold text-text">{t('page.viewLoadError')}</p>
      <div className="mt-4">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="cursor-pointer rounded-md border border-border bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-text transition-colors hover:border-[#3a4250]"
        >
          {t('page.reload')}
        </button>
      </div>
    </div>
  )
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorBoundaryFallback />
    }

    return this.props.children
  }
}
