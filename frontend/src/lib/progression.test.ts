import { describe, expect, it } from 'vitest'
import type { ProgressionResponse } from '../api/types'
import { computeLineStyles, defaultVisible, toChartRows } from './progression'

const PROGRESSION_1988: ProgressionResponse = {
  season: 1988,
  system: '1991',
  races: [
    { round: 1, code: 'BRA', sprint: false },
    { round: 2, code: 'SMR', sprint: false },
    { round: 3, code: 'MON', sprint: false },
  ],
  drivers: [
    {
      driverId: 'alain-prost',
      driverName: 'Alain Prost',
      driverCode: 'PRO',
      constructorId: 'mclaren',
      position: 1,
      points: [10, 16, 26],
    },
    {
      driverId: 'ayrton-senna',
      driverName: 'Ayrton Senna',
      driverCode: 'SEN',
      constructorId: 'mclaren',
      position: 2,
      points: [0, 10, 10],
    },
    {
      driverId: 'gerhard-berger',
      driverName: 'Gerhard Berger',
      driverCode: 'BER',
      constructorId: 'ferrari',
      position: 3,
      points: [6, 8, 12],
    },
    {
      driverId: 'thierry-boutsen',
      driverName: 'Thierry Boutsen',
      driverCode: 'BOU',
      constructorId: 'benetton',
      position: 4,
      points: [0, 3, 6],
    },
    {
      driverId: 'michele-alboreto',
      driverName: 'Michele Alboreto',
      driverCode: 'ALB',
      constructorId: 'ferrari',
      position: 5,
      points: [2, 2, 5],
    },
    {
      driverId: 'nelson-piquet',
      driverName: 'Nelson Piquet',
      driverCode: 'PIQ',
      constructorId: 'lotus',
      position: 6,
      points: [4, 8, 8],
    },
  ],
  clinch: { round: 3, code: 'MON', driverId: 'alain-prost' },
}

describe('progression helpers', () => {
  it('builds chart rows with race, round, and per-driver cumulative points', () => {
    expect(toChartRows(PROGRESSION_1988)).toEqual([
      {
        race: 'BRA',
        round: 1,
        'alain-prost': 10,
        'ayrton-senna': 0,
        'gerhard-berger': 6,
        'thierry-boutsen': 0,
        'michele-alboreto': 2,
        'nelson-piquet': 4,
      },
      {
        race: 'SMR',
        round: 2,
        'alain-prost': 16,
        'ayrton-senna': 10,
        'gerhard-berger': 8,
        'thierry-boutsen': 3,
        'michele-alboreto': 2,
        'nelson-piquet': 8,
      },
      {
        race: 'MON',
        round: 3,
        'alain-prost': 26,
        'ayrton-senna': 10,
        'gerhard-berger': 12,
        'thierry-boutsen': 6,
        'michele-alboreto': 5,
        'nelson-piquet': 8,
      },
    ])
  })

  it('picks top 5 by default and appends the real champion when outside top 5', () => {
    expect(defaultVisible(PROGRESSION_1988, 'ayrton-senna')).toEqual([
      'alain-prost',
      'ayrton-senna',
      'gerhard-berger',
      'thierry-boutsen',
      'michele-alboreto',
    ])

    expect(defaultVisible(PROGRESSION_1988, 'nelson-piquet')).toEqual([
      'alain-prost',
      'ayrton-senna',
      'gerhard-berger',
      'thierry-boutsen',
      'michele-alboreto',
      'nelson-piquet',
    ])

    // Does not append a driver who is absent from the progression response.
    expect(defaultVisible(PROGRESSION_1988, 'nigel-mansell')).toEqual([
      'alain-prost',
      'ayrton-senna',
      'gerhard-berger',
      'thierry-boutsen',
      'michele-alboreto',
    ])
  })

  it('dashes the second visible driver sharing a constructor', () => {
    const bothMcLarens = computeLineStyles(
      PROGRESSION_1988.drivers,
      new Set(['alain-prost', 'ayrton-senna', 'gerhard-berger']),
    )
    expect(bothMcLarens.get('alain-prost')?.dashArray).toBeUndefined()
    expect(bothMcLarens.get('ayrton-senna')?.dashArray).toBe('6 4')
    expect(bothMcLarens.get('gerhard-berger')?.dashArray).toBeUndefined()

    const onlySenna = computeLineStyles(
      PROGRESSION_1988.drivers,
      new Set(['ayrton-senna']),
    )
    expect(onlySenna.get('ayrton-senna')?.dashArray).toBeUndefined()
  })

  it('keeps distinct rounds when two races share the same 3-letter code', () => {
    const progression2020: ProgressionResponse = {
      season: 2020,
      system: '2010',
      races: [
        { round: 1, code: 'AUT', sprint: false },
        { round: 2, code: 'AUT', sprint: false },
        { round: 15, code: 'BHR', sprint: false },
        { round: 16, code: 'BHR', sprint: false },
      ],
      drivers: [
        {
          driverId: 'lewis-hamilton',
          driverName: 'Lewis Hamilton',
          driverCode: 'HAM',
          constructorId: 'mercedes',
          position: 1,
          points: [12, 37, 332, 332],
        },
        {
          driverId: 'valtteri-bottas',
          driverName: 'Valtteri Bottas',
          driverCode: 'BOT',
          constructorId: 'mercedes',
          position: 2,
          points: [25, 43, 201, 205],
        },
      ],
      clinch: { round: 15, code: 'BHR', driverId: 'lewis-hamilton' },
    }

    const rows = toChartRows(progression2020)
    expect(rows).toEqual([
      { race: 'AUT', round: 1, 'lewis-hamilton': 12, 'valtteri-bottas': 25 },
      { race: 'AUT', round: 2, 'lewis-hamilton': 37, 'valtteri-bottas': 43 },
      { race: 'BHR', round: 15, 'lewis-hamilton': 332, 'valtteri-bottas': 201 },
      { race: 'BHR', round: 16, 'lewis-hamilton': 332, 'valtteri-bottas': 205 },
    ])
    expect(new Set(rows.map((r) => r.round)).size).toBe(4)
  })
})
