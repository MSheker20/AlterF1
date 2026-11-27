import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { strings } from '../../i18n/strings'
import { HealthBadge } from '../HealthBadge'

/** The AlterF1 word mark; always leads back to the home page. */
export function BrandLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-text no-underline transition-opacity hover:opacity-90"
    >
      <span aria-hidden="true" className="h-5 w-1 rounded-[2px] bg-accent" />
      <span>{strings.brand}</span>
    </Link>
  )
}

/** Footer with the F1DB attribution required by its CC BY 4.0 licence. */
export function SiteFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`border-t border-border ${className}`}>
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
  )
}

/** Header + main + footer for pages outside a season. */
export function SimplePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-text">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3 sm:px-6">
          <BrandLink />
        </div>
      </header>
      {children}
      <SiteFooter />
    </div>
  )
}
