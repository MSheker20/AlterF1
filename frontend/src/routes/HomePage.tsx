import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { useHighlights } from '../api/highlights'
import { useSeasons } from '../api/standings'
import type { Highlight, HighlightAlternative } from '../api/types'
import { SimplePage } from '../components/layout/SiteChrome'
import { ErrorPanel } from '../components/season/ErrorPanel'
import { YearSelect } from '../components/tower/YearSelect'
import { useLocalizedPath } from '../i18n/useLocalizedPath'
import { formatPoints, getSurname } from '../lib/format'
import { teamColor } from '../lib/teamColors'

/** Home page: the seasons whose champion changes under another system (PLAN.md §2.0). */
export function HomePage() {
  const { t } = useTranslation()
  const { to } = useLocalizedPath()
  const highlightsQuery = useHighlights()
  const seasonsQuery = useSeasons()
  const navigate = useNavigate()
  // Newest first: recent seasons are the ones most visitors remember.
  const highlights = [...(highlightsQuery.data ?? [])].reverse()

  return (
    <SimplePage>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12">
        <section className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-balance text-text sm:text-4xl">
            {t('home.title')} <span className="text-accent">{t('home.titleAccent')}</span>
          </h1>
          <p className="text-sm text-muted sm:text-base">
            {t('home.intro')}
            {highlightsQuery.data && <> {t('home.countLine', { count: highlightsQuery.data.length })}</>}
          </p>
        </section>

        <section className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text">{t('home.pickerHeading')}</h2>
            <p className="text-xs text-muted">{t('home.pickerHint')}</p>
          </div>
          <YearSelect
            seasons={seasonsQuery.data ?? []}
            selectedYear={null}
            disabled={!seasonsQuery.data}
            onChange={(year) => navigate(to(`/season/${year}`))}
          />
        </section>

        <section aria-labelledby="highlights-heading" className="space-y-4">
          <h2
            id="highlights-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            {t('home.cardsHeading')}
          </h2>
          {highlightsQuery.isError ? (
            <ErrorPanel
              title={t('home.loadError')}
              detail=""
              onRetry={() => void highlightsQuery.refetch()}
            />
          ) : highlightsQuery.isPending ? (
            <CardSkeletons />
          ) : (
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((highlight) => (
                <HighlightCard key={highlight.season} highlight={highlight} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </SimplePage>
  )
}

function HighlightCard({ highlight }: { highlight: Highlight }) {
  const { t } = useTranslation()
  const { season, realChampion, realSystem, alternatives } = highlight
  return (
    <li className="flex flex-col rounded-lg border border-border bg-surface">
      <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 pt-3 pb-2.5">
        <span className="text-2xl font-bold tabular-nums tracking-tight text-text">{season}</span>
        <span className="truncate text-xs text-muted">
          {t('home.realLine', { name: getSurname(realChampion.driverName), system: realSystem })}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col p-1.5">
        {alternatives.map((alt) => (
          <li key={alt.system}>
            <AlternativeRow season={season} realName={realChampion.driverName} alternative={alt} />
          </li>
        ))}
      </ul>
    </li>
  )
}

function AlternativeRow({
  season,
  realName,
  alternative,
}: {
  season: number
  realName: string
  alternative: HighlightAlternative
}) {
  const { system, champion, championConstructorId, realChampionPosition, realChampionPoints } =
    alternative
  const { t } = useTranslation()
  const { to } = useLocalizedPath()
  return (
    <Link
      to={to(`/season/${season}?system=${system}`)}
      className="group flex items-center gap-3 rounded-md px-2.5 py-2 no-underline transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
    >
      {/* The link is named by this sentence; the visual parts below are hidden from screen readers. */}
      <span className="sr-only">
        {t('home.alternativeAria', {
          year: season,
          system,
          winner: champion.driverName,
          real: realName,
        })}
      </span>
      <span
        aria-hidden="true"
        className="h-8 w-1 shrink-0 rounded-[2px]"
        style={{ backgroundColor: teamColor(championConstructorId) }}
      />
      <span aria-hidden="true" className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t('home.underRules', { system })}
        </span>
        <span className="block truncate text-sm font-semibold text-text">
          {getSurname(champion.driverName)}{' '}
          <span className="font-normal tabular-nums text-muted">{formatPoints(champion.points)}</span>
        </span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-right text-xs tabular-nums text-muted">
        {t('home.realFinish', { surname: getSurname(realName), position: realChampionPosition })}
        <span className="block">{formatPoints(realChampionPoints)}</span>
      </span>
      <span
        aria-hidden="true"
        className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text"
      >
        →
      </span>
    </Link>
  )
}

function CardSkeletons() {
  return (
    <div aria-busy="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="h-36 rounded-lg border border-border bg-surface motion-safe:animate-pulse"
        />
      ))}
    </div>
  )
}
