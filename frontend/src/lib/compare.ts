import type { CompareCell, CompareDriverRow } from '../api/types'

export type CompareSortKey = 'real' | string

export interface SortableCompareRow {
  name: string
  realPosition: number | null
  cells: Partial<Record<string, CompareCell>>
}

/** Ascending positions, missing ones last. (Infinity - Infinity is NaN, so no subtraction trick.) */
function comparePositions(a: number | null | undefined, b: number | null | undefined): number {
  const hasA = a != null
  const hasB = b != null
  if (hasA && hasB) {
    return a - b
  }
  if (hasA !== hasB) {
    return hasA ? -1 : 1
  }
  return 0
}

export function sortCompareRows<T extends SortableCompareRow>(
  rows: readonly T[],
  key: CompareSortKey,
): T[] {
  return [...rows].sort((a, b) => {
    if (key !== 'real') {
      const cellDiff = comparePositions(a.cells[key]?.position, b.cells[key]?.position)
      if (cellDiff !== 0) {
        return cellDiff
      }
    }

    const realDiff = comparePositions(a.realPosition, b.realPosition)
    if (realDiff !== 0) {
      return realDiff
    }

    return a.name.localeCompare(b.name)
  })
}

export function sortDrivers(
  drivers: readonly CompareDriverRow[],
  key: CompareSortKey,
): CompareDriverRow[] {
  return [...drivers].sort((a, b) => {
    if (key !== 'real') {
      const cellDiff = comparePositions(a.cells[key]?.position, b.cells[key]?.position)
      if (cellDiff !== 0) {
        return cellDiff
      }
    }

    const realDiff = comparePositions(a.realPosition, b.realPosition)
    if (realDiff !== 0) {
      return realDiff
    }

    return a.driverName.localeCompare(b.driverName)
  })
}
