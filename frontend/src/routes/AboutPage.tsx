import { useTranslation } from 'react-i18next'
import { useSystems } from '../api/standings'
import { SimplePage } from '../components/layout/SiteChrome'
import { formatPoints } from '../lib/format'

const SYSTEM_RULE_KEYS = {
  '1950': 'about.system1950',
  '1961': 'about.system1961',
  '1991': 'about.system1991',
  '2003': 'about.system2003',
  '2010': 'about.system2010',
} as const

const SYSTEM_IDS = Object.keys(SYSTEM_RULE_KEYS) as (keyof typeof SYSTEM_RULE_KEYS)[]

const NOTE_SECTIONS = [
  ['about.halfPointsHeading', 'about.halfPointsBody'],
  ['about.doublePointsHeading', 'about.doublePointsBody'],
  ['about.fiftiesHeading', 'about.fiftiesBody'],
  ['about.sprintHeading', 'about.sprintBody'],
  ['about.ineligibleHeading', 'about.ineligibleBody'],
] as const

/** How the points systems are modelled, the notes behind unusual points, and the F1DB attribution. */
export function AboutPage() {
  const { t } = useTranslation()
  const systemsQuery = useSystems()

  return (
    <SimplePage>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-10 px-4 py-8 sm:px-6 sm:py-12">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-text">{t('about.title')}</h1>
          <p className="text-sm leading-relaxed text-muted sm:text-base">{t('about.intro')}</p>
        </header>

        <section aria-labelledby="systems-heading" className="space-y-3">
          <h2 id="systems-heading" className="text-lg font-semibold text-text">
            {t('about.systemsHeading')}
          </h2>
          <p className="text-sm text-muted">{t('about.systemsIntro')}</p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead className="bg-surface text-xs text-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">{t('about.colSystem')}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{t('about.colPoints')}</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{t('about.colRules')}</th>
                </tr>
              </thead>
              <tbody>
                {/* Rows are known up front, so the table does not shift the page when data arrives. */}
                {SYSTEM_IDS.map((id) => {
                  const system = systemsQuery.data?.find((s) => s.id === id)
                  return (
                    <tr key={id} className="border-t border-border align-top">
                      <th scope="row" className="px-3 py-2.5 font-semibold tabular-nums text-text">
                        {id}
                        <span className="block min-h-4 text-xs font-normal text-muted">
                          {system ? `${system.firstSeason}–${system.lastSeason ?? ''}` : ''}
                        </span>
                      </th>
                      <td className="px-3 py-2.5 tabular-nums text-text">
                        {system ? system.racePoints.map(formatPoints).join('-') : '…'}
                      </td>
                      <td className="px-3 py-2.5 text-muted">{t(SYSTEM_RULE_KEYS[id])}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="era-heading" className="space-y-2">
          <h2 id="era-heading" className="text-lg font-semibold text-text">{t('about.eraHeading')}</h2>
          <p className="text-sm leading-relaxed text-muted">{t('about.eraBody')}</p>
        </section>

        <section aria-labelledby="notes-heading" className="space-y-4">
          <h2 id="notes-heading" className="text-lg font-semibold text-text">
            {t('about.notesHeading')}
          </h2>
          <dl className="m-0 space-y-4">
            {NOTE_SECTIONS.map(([heading, body]) => (
              <div key={heading} className="border-l-2 border-border pl-4">
                <dt className="text-sm font-semibold text-text">{t(heading)}</dt>
                <dd className="m-0 mt-1 text-sm leading-relaxed text-muted">{t(body)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="data-heading" className="space-y-2">
          <h2 id="data-heading" className="text-lg font-semibold text-text">{t('about.dataHeading')}</h2>
          <p className="text-sm leading-relaxed text-muted">{t('about.dataBody')}</p>
          <a
            href="https://github.com/f1db/f1db"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-text underline decoration-border underline-offset-4 hover:decoration-text"
          >
            {t('about.dataLink')}
          </a>
        </section>
      </main>
    </SimplePage>
  )
}
