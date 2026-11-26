import { describe, expect, it } from 'vitest'
import type { CompareDriverRow } from '../api/types'
import { sortDrivers } from './compare'

const DRIVERS: CompareDriverRow[] = [
  {
    driverId: 'ayrton-senna',
    driverName: 'Ayrton Senna',
    driverCode: 'SEN',
    constructorId: 'mclaren',
    constructorName: 'McLaren',
    realPosition: 1,
    cells: {
      '1950': { position: 2, points: 70 },
      '1961': { position: 1, points: 90 },
      '1991': { position: 2, points: 102 },
    },
  },
  {
    driverId: 'alain-prost',
    driverName: 'Alain Prost',
    driverCode: 'PRO',
    constructorId: 'mclaren',
    constructorName: 'McLaren',
    realPosition: 2,
    cells: {
      '1950': { position: 1, points: 72 },
      '1961': { position: 2, points: 87 },
      '1991': { position: 1, points: 112 },
    },
  },
  {
    driverId: 'gerhard-berger',
    driverName: 'Gerhard Berger',
    driverCode: 'BER',
    constructorId: 'ferrari',
    constructorName: 'Ferrari',
    realPosition: 3,
    cells: {
      '1961': { position: 3, points: 41 },
      '1991': { position: 3, points: 42 },
    },
  },
  {
    driverId: 'julian-bailey',
    driverName: 'Julian Bailey',
    driverCode: 'BAI',
    constructorId: 'tyrrell',
    constructorName: 'Tyrrell',
    realPosition: null,
    cells: {},
  },
  {
    driverId: 'alex-caffi',
    driverName: 'Alex Caffi',
    driverCode: 'CAF',
    constructorId: 'dallara',
    constructorName: 'Dallara',
    realPosition: null,
    cells: {
      '1991': { position: 10, points: 1 },
    },
  },
]

describe('sortDrivers', () => {
  it('sorts by realPosition ascending with nulls last and name tie-breaker', () => {
    const shuffled = [DRIVERS[3], DRIVERS[2], DRIVERS[4], DRIVERS[1], DRIVERS[0]]
    const sorted = sortDrivers(shuffled, 'real')

    expect(sorted.map((d) => d.driverId)).toEqual([
      'ayrton-senna',
      'alain-prost',
      'gerhard-berger',
      'alex-caffi',
      'julian-bailey',
    ])
    // Does not mutate the input array.
    expect(shuffled[0].driverId).toBe('julian-bailey')
  })

  it('sorts by a system column placing missing cells last and tie-breaking by realPosition then name', () => {
    const by1950 = sortDrivers(DRIVERS, '1950')
    expect(by1950.map((d) => d.driverId)).toEqual([
      'alain-prost',
      'ayrton-senna',
      'gerhard-berger',
      'alex-caffi',
      'julian-bailey',
    ])

    const by1991 = sortDrivers(DRIVERS, '1991')
    expect(by1991.map((d) => d.driverId)).toEqual([
      'alain-prost',
      'ayrton-senna',
      'gerhard-berger',
      'alex-caffi',
      'julian-bailey',
    ])
  })
})
