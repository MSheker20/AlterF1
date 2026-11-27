import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ApiError } from '../../api/client'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'

export const DEFAULT_SEASON_ROUTE = '/season/1988?system=1991'

export interface ErrorPanelProps {
  title: string
  detail: string
  showBackLink?: boolean
  onRetry?: () => void
}

export function ErrorPanel({
  title,
  detail,
  showBackLink = false,
  onRetry,
}: ErrorPanelProps) {
  const { t } = useTranslation()
  const { to } = useLocalizedPath()

  return (
    <div
      role="alert"
      className="rounded-lg border border-border border-l-[3px] border-l-err bg-surface p-5"
    >
      <p className="m-0 text-sm font-semibold text-text">{title}</p>
      {detail && <p className="mt-1.5 text-sm text-muted">{detail}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="cursor-pointer rounded-md border border-border bg-surface-2 px-3.5 py-1.5 text-xs font-semibold text-text transition-colors hover:border-[#3a4250]"
          >
            {t('page.retry')}
          </button>
        )}
        {showBackLink && (
          <Link
            to={to(DEFAULT_SEASON_ROUTE)}
            className="inline-flex items-center rounded-md border border-border px-3.5 py-1.5 text-xs font-semibold text-text no-underline transition-colors hover:bg-surface-2"
          >
            {t('page.backToDefaultSeason')}
          </Link>
        )}
      </div>
    </div>
  )
}

interface QueryErrorStateProps {
  error: unknown
  onRetry: () => void
}

export function QueryErrorState({ error, onRetry }: QueryErrorStateProps) {
  const { t } = useTranslation()

  if (error instanceof ApiError) {
    return (
      <ErrorPanel
        title={error.title}
        detail={error.detail}
        showBackLink={error.status === 400 || error.status === 404}
        onRetry={onRetry}
      />
    )
  }

  return (
    <ErrorPanel
      title={t('page.genericErrorTitle')}
      detail={error instanceof Error ? error.message : t('page.genericErrorDetail')}
      onRetry={onRetry}
    />
  )
}

export interface StandingsErrorBannerProps {
  error: unknown
  onRetry: () => void
}

export function StandingsErrorBanner({ error, onRetry }: StandingsErrorBannerProps) {
  const { t } = useTranslation()
  const title = error instanceof ApiError ? error.title : t('page.genericErrorTitle')
  const detail =
    error instanceof ApiError
      ? error.detail
      : error instanceof Error
        ? error.message
        : t('page.genericErrorDetail')

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border border-l-[3px] border-l-err bg-surface px-4 py-2.5 text-xs"
    >
      <p className="m-0 text-muted">
        <span className="font-semibold text-text">{title}</span>
        {detail ? ` — ${detail}` : null}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 cursor-pointer rounded-md border border-border bg-surface-2 px-3 py-1 text-xs font-semibold text-text transition-colors hover:border-[#3a4250]"
      >
        {t('page.retry')}
      </button>
    </div>
  )
}
