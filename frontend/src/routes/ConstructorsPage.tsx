import { SeasonLayout } from '../components/season/SeasonLayout'
import { TowerTab } from './SeasonPage'

/** Constructors' championship layout wrapper (lazy-loaded route entry for /season/:year/constructors). */
export function ConstructorsLayout() {
  return <SeasonLayout mode="constructors" />
}

export function ConstructorsPage() {
  return (
    <SeasonLayout mode="constructors">
      <TowerTab />
    </SeasonLayout>
  )
}
