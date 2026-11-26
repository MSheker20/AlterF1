import { describe, expect, it } from 'vitest'
import type { RulesSummary } from '../api/types'
import {
  countActive,
  countActivePayload,
  createDefaultScenario,
  customFromRules,
  defaultSystemForYear,
  formatRulesDescription,
  isDefaultScenario,
  parseScenario,
  scenarioForYearChange,
  scenarioToParams,
  validateCustomPoints,
} from './scenario'

describe('scenario URL state', () => {
  it('round-trips built-in scenario params cleanly', () => {
    const original = new URLSearchParams(
      'system=1991&preset=pure&exclude=max-verstappen,sergio-perez&skip=7,5&sprint=off&fl=off',
    )

    const parsed = parseScenario(original)
    expect(parsed).toEqual({
      system: '1991',
      preset: 'pure',
      exclude: ['max-verstappen', 'sergio-perez'],
      skip: [5, 7],
      sprint: false,
      fl: false,
      custom: null,
    })
    expect(isDefaultScenario(parsed)).toBe(false)
    expect(countActive(parsed)).toBe(7)

    const serialized = scenarioToParams(parsed)
    expect(serialized.get('system')).toBe('1991')
    expect(serialized.get('preset')).toBe('pure')
    expect(serialized.get('exclude')).toBe('max-verstappen,sergio-perez')
    expect(serialized.get('skip')).toBe('5,7')
    expect(serialized.get('sprint')).toBe('off')
    expect(serialized.get('fl')).toBe('off')
    expect(serialized.has('custom')).toBe(false)

    expect(parseScenario(serialized)).toEqual(parsed)
  })

  it('round-trips custom system params cleanly', () => {
    const original = new URLSearchParams(
      'system=custom&custom=25,18,15,12.5&customFl=on&customSprint=321&customBest=11',
    )

    const parsed = parseScenario(original)
    expect(parsed).toEqual({
      system: 'custom',
      preset: 'historical',
      exclude: [],
      skip: [],
      sprint: true,
      fl: true,
      custom: {
        racePoints: [25, 18, 15, 12.5],
        fastestLap: true,
        sprint: '321',
        bestResults: 11,
      },
    })
    expect(countActive(parsed)).toBe(1)

    const serialized = scenarioToParams(parsed)
    expect(serialized.get('system')).toBe('custom')
    expect(serialized.get('custom')).toBe('25,18,15,12.5')
    expect(serialized.get('customFl')).toBe('on')
    expect(serialized.get('customSprint')).toBe('321')
    expect(serialized.get('customBest')).toBe('11')
    expect(serialized.has('preset')).toBe(false)
    expect(serialized.has('sprint')).toBe(false)
    expect(serialized.has('fl')).toBe(false)

    expect(parseScenario(serialized)).toEqual(parsed)
  })

  it('omits defaults when serialising', () => {
    const def = createDefaultScenario('2010')
    expect(isDefaultScenario(def)).toBe(true)
    expect(countActive(def)).toBe(0)

    const params = scenarioToParams(def)
    expect(params.toString()).toBe('system=2010')

    const customWithDefaults = createDefaultScenario('custom')
    const customParams = scenarioToParams(customWithDefaults)
    expect(customParams.get('system')).toBe('custom')
    expect(customParams.get('custom')).toBe('25,18,15,12,10,8,6,4,2,1')
    expect(customParams.has('customFl')).toBe(false)
    expect(customParams.has('customSprint')).toBe(false)
    expect(customParams.has('customBest')).toBe(false)
  })

  it('ignores unknown and invalid parameter values client-side', () => {
    const params = new URLSearchParams(
      'system=9999&preset=bogus&exclude=,max-verstappen,,max-verstappen&skip=abc,0,-4,5,5,2&sprint=maybe&fl=yes',
    )

    const parsed = parseScenario(params, defaultSystemForYear(2023))
    expect(parsed).toEqual({
      system: '1991',
      preset: 'historical',
      exclude: ['max-verstappen'],
      skip: [2, 5],
      sprint: true,
      fl: true,
      custom: null,
    })

    const badCustom = parseScenario(
      new URLSearchParams(
        'system=custom&custom=bad,values&customFl=nope&customSprint=99&customBest=99',
      ),
    )
    expect(badCustom.system).toBe('custom')
    expect(badCustom.custom).toEqual({
      racePoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
      fastestLap: false,
      sprint: 'none',
      bestResults: null,
    })
  })

  it('drops season-specific exclude and skip on year change while keeping other params', () => {
    const current = parseScenario(
      new URLSearchParams(
        'system=custom&custom=10,6,4&customFl=on&preset=pure&sprint=off&fl=off&exclude=max-verstappen&skip=5,7',
      ),
    )

    const next = scenarioForYearChange(current, true, 1988)
    expect(next.exclude).toEqual([])
    expect(next.skip).toEqual([])
    expect(next.system).toBe('custom')
    expect(next.preset).toBe('pure')
    expect(next.sprint).toBe(false)
    expect(next.fl).toBe(false)
    expect(next.custom).toEqual(current.custom)

    const implicit = parseScenario(new URLSearchParams('exclude=ayrton-senna&preset=all'), '2010')
    const switchedToModern = scenarioForYearChange(implicit, false, 2023)
    expect(switchedToModern.system).toBe('1991')
    expect(switchedToModern.preset).toBe('all')
    expect(switchedToModern.exclude).toEqual([])
  })

  it('validates custom points strings', () => {
    expect(validateCustomPoints('25, 18, 15.5')).toEqual({
      points: [25, 18, 15.5],
      error: null,
    })
    expect(validateCustomPoints('').points).toBeNull()
    expect(validateCustomPoints('25,abc').points).toBeNull()
    expect(validateCustomPoints('25,18.123').points).toBeNull()
    expect(validateCustomPoints('1001').points).toBeNull()
    expect(validateCustomPoints(Array.from({ length: 41 }, () => '1').join(',')).points).toBeNull()
  })

  it('copies current rules into custom config and formats rule descriptions', () => {
    const rules: RulesSummary = {
      racePoints: [25, 18, 15],
      sprintPoints: [3, 2, 1],
      fastestLap: { points: 1, maxPosition: 10 },
      bestResults: { type: 'season', count: 11 },
    }

    expect(customFromRules(rules)).toEqual({
      racePoints: [25, 18, 15],
      fastestLap: true,
      sprint: '321',
      bestResults: 11,
    })

    expect(formatRulesDescription('custom', rules)).toBe(
      'Custom · 25-18-15 · fastest lap +1 (top 10) · sprint 3-2-1 · best 11',
    )
    expect(
      formatRulesDescription('1991', {
        racePoints: [10, 6, 4, 3, 2, 1],
        sprintPoints: [],
        fastestLap: null,
        bestResults: { type: 'all' },
      }),
    ).toBe('1991 rules · 10-6-4-3-2-1')
  })

  it('sorts exclude ids when parsing and serialising so equivalent scenarios share one query string', () => {
    const parsed = parseScenario(
      new URLSearchParams('system=1991&exclude=sergio-perez,max-verstappen,charles-leclerc'),
    )
    expect(parsed.exclude).toEqual(['charles-leclerc', 'max-verstappen', 'sergio-perez'])

    const a = {
      ...createDefaultScenario('1991'),
      exclude: ['sergio-perez', 'max-verstappen', 'charles-leclerc'],
    }
    const b = {
      ...createDefaultScenario('1991'),
      exclude: ['charles-leclerc', 'max-verstappen', 'sergio-perez'],
    }

    const paramsA = scenarioToParams(a)
    const paramsB = scenarioToParams(b)
    expect(paramsA.get('exclude')).toBe('charles-leclerc,max-verstappen,sergio-perez')
    expect(paramsA.toString()).toBe(paramsB.toString())
    expect(a.exclude).toEqual(['sergio-perez', 'max-verstappen', 'charles-leclerc'])
  })

  it('counts active changes from an API scenario payload', () => {
    expect(
      countActivePayload(
        {
          excludedDrivers: [],
          skippedRounds: [],
          sprints: true,
          fastestLap: true,
          preset: 'historical',
          custom: null,
        },
        '1991',
      ),
    ).toBe(0)

    expect(
      countActivePayload(
        {
          excludedDrivers: ['max-verstappen', 'sergio-perez'],
          skippedRounds: [5],
          sprints: false,
          fastestLap: false,
          preset: 'pure',
          custom: {
            racePoints: [10, 6, 4],
            fastestLap: false,
            sprint: 'none',
            bestResults: null,
          },
        },
        'custom',
      ),
    ).toBe(7)
  })
})
