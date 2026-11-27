import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { SeasonNote } from '../../api/types'
import { useLocalizedPath } from '../../i18n/useLocalizedPath'

/**
 * The small "i" under the tower (PLAN.md §7): only shown when the season has something that
 * makes its points look unusual, and only the notes that apply.
 */
export function SeasonNotes({ notes }: { notes: readonly SeasonNote[] }) {
  const { t } = useTranslation()
  const { to } = useLocalizedPath()
  const [open, setOpen] = useState(false)
  const panelId = useId()

  if (notes.length === 0) {
    return null
  }

  return (
    <div className="text-xs text-muted">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md py-1 pr-2 text-xs font-semibold text-muted transition-colors hover:text-text"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-current font-serif text-[11px] italic leading-none"
        >
          i
        </span>
        {t('notes.heading')}
      </button>
      {open && (
        <div id={panelId} className="mt-1.5 max-w-2xl rounded-lg border border-border bg-surface px-4 py-3">
          <ul className="m-0 list-disc space-y-1.5 pl-4">
            {notes.map((note) => (
              <li key={note}>{t(`notes.${note}`)}</li>
            ))}
          </ul>
          <Link
            to={to('/about')}
            className="mt-2.5 inline-block text-text underline decoration-border underline-offset-4 hover:decoration-text"
          >
            {t('notes.more')}
          </Link>
        </div>
      )}
    </div>
  )
}
