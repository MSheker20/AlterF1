import type {
  BuiltinSystemId,
  CustomSprintMode,
  CustomSystemConfig,
  MultiplierPreset,
  RulesSummary,
  ScenarioPayload,
  SystemId,
} from '../api/types'
import { formatPoints } from './format'

export interface Scenario {
  system: SystemId
  preset: MultiplierPreset
  exclude: string[]
  skip: number[]
  sprint: boolean
  fl: boolean
  custom: CustomSystemConfig | null
}

export interface CustomPointsValidation {
  points: number[] | null
  error: string | null
}

export const BUILTIN_SYSTEM_IDS: readonly BuiltinSystemId[] = [
  '1950',
  '1961',
  '1991',
  '2003',
  '2010',
]

export const ALL_SYSTEM_IDS: readonly SystemId[] = [...BUILTIN_SYSTEM_IDS, 'custom']

export const DEFAULT_CUSTOM_POINTS: readonly number[] = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

const PRESETS: readonly MultiplierPreset[] = ['historical', 'pure', 'all']
const CUSTOM_SPRINT_MODES: readonly CustomSprintMode[] = ['none', '321', '8']
const DECIMAL_TOKEN_RE = /^\d+(?:\.\d{1,2})?$/
const POSITIVE_INT_RE = /^\d+$/

export function defaultSystemForYear(year: number | null): BuiltinSystemId {
  return year !== null && year >= 2010 ? '1991' : '2010'
}

export function isKnownSystemId(value: string | null | undefined): value is SystemId {
  return value !== null && value !== undefined && (ALL_SYSTEM_IDS as readonly string[]).includes(value)
}

export function createDefaultCustomConfig(): CustomSystemConfig {
  return {
    racePoints: [...DEFAULT_CUSTOM_POINTS],
    fastestLap: false,
    sprint: 'none',
    bestResults: null,
  }
}

export function createDefaultScenario(system: SystemId = '2010'): Scenario {
  return {
    system,
    preset: 'historical',
    exclude: [],
    skip: [],
    sprint: true,
    fl: true,
    custom: system === 'custom' ? createDefaultCustomConfig() : null,
  }
}

export function validateCustomPoints(raw: string): CustomPointsValidation {
  const trimmed = raw.trim()
  if (trimmed.length === 0) {
    return { points: null, error: 'Enter between 1 and 40 point values separated by commas.' }
  }

  const tokens = trimmed.split(',').map((token) => token.trim())
  if (tokens.length > 40) {
    return { points: null, error: 'Use at most 40 point positions.' }
  }

  const points: number[] = []
  for (const token of tokens) {
    if (!DECIMAL_TOKEN_RE.test(token)) {
      return {
        points: null,
        error: 'Each point value must be a number between 0 and 1000 with at most 2 decimals.',
      }
    }
    const value = Number.parseFloat(token)
    if (!Number.isFinite(value) || value < 0 || value > 1000) {
      return {
        points: null,
        error: 'Each point value must be between 0 and 1000.',
      }
    }
    points.push(value)
  }

  return { points, error: null }
}

function parseExclude(raw: string | null): string[] {
  if (!raw) {
    return []
  }
  const seen = new Set<string>()
  const result: string[] = []
  for (const token of raw.split(',')) {
    const cleaned = token.trim()
    if (cleaned.length > 0 && !seen.has(cleaned)) {
      seen.add(cleaned)
      result.push(cleaned)
    }
  }
  return result.sort()
}

function parseSkip(raw: string | null): number[] {
  if (!raw) {
    return []
  }
  const seen = new Set<number>()
  for (const token of raw.split(',')) {
    const cleaned = token.trim()
    if (!POSITIVE_INT_RE.test(cleaned)) {
      continue
    }
    const round = Number.parseInt(cleaned, 10)
    if (Number.isInteger(round) && round > 0) {
      seen.add(round)
    }
  }
  return Array.from(seen).sort((a, b) => a - b)
}

function parsePreset(raw: string | null): MultiplierPreset {
  const cleaned = raw?.trim()
  if (cleaned && (PRESETS as readonly string[]).includes(cleaned)) {
    return cleaned as MultiplierPreset
  }
  return 'historical'
}

function parseOnOff(raw: string | null, defaultValue: boolean): boolean {
  const cleaned = raw?.trim()
  if (cleaned === 'on') {
    return true
  }
  if (cleaned === 'off') {
    return false
  }
  return defaultValue
}

function parseCustomSprint(raw: string | null): CustomSprintMode {
  const cleaned = raw?.trim()
  if (cleaned && (CUSTOM_SPRINT_MODES as readonly string[]).includes(cleaned)) {
    return cleaned as CustomSprintMode
  }
  return 'none'
}

function parseCustomBest(raw: string | null): number | null {
  const cleaned = raw?.trim()
  if (!cleaned || !POSITIVE_INT_RE.test(cleaned)) {
    return null
  }
  const count = Number.parseInt(cleaned, 10)
  return Number.isInteger(count) && count >= 1 && count <= 40 ? count : null
}

export function parseScenario(
  searchParams: URLSearchParams,
  defaultSystem: SystemId = '2010',
): Scenario {
  const rawSystem = searchParams.get('system')?.trim()
  const system: SystemId = isKnownSystemId(rawSystem) ? rawSystem : defaultSystem

  const preset = parsePreset(searchParams.get('preset'))
  const exclude = parseExclude(searchParams.get('exclude'))
  const skip = parseSkip(searchParams.get('skip'))
  const sprint = parseOnOff(searchParams.get('sprint'), true)
  const fl = parseOnOff(searchParams.get('fl'), true)

  let custom: CustomSystemConfig | null = null
  if (system === 'custom') {
    const rawCustom = searchParams.get('custom')
    const validated = rawCustom !== null ? validateCustomPoints(rawCustom) : null
    custom = {
      racePoints: validated?.points ?? [...DEFAULT_CUSTOM_POINTS],
      fastestLap: parseOnOff(searchParams.get('customFl'), false),
      sprint: parseCustomSprint(searchParams.get('customSprint')),
      bestResults: parseCustomBest(searchParams.get('customBest')),
    }
  }

  return {
    system,
    preset,
    exclude,
    skip,
    sprint,
    fl,
    custom,
  }
}

export function scenarioToParams(scenario: Scenario): URLSearchParams {
  const params = new URLSearchParams()
  params.set('system', scenario.system)

  if (scenario.preset !== 'historical') {
    params.set('preset', scenario.preset)
  }
  if (scenario.exclude.length > 0) {
    const sortedExclude = [...scenario.exclude].sort()
    params.set('exclude', sortedExclude.join(','))
  }
  if (scenario.skip.length > 0) {
    const sortedSkip = [...scenario.skip].sort((a, b) => a - b)
    params.set('skip', sortedSkip.join(','))
  }
  if (!scenario.sprint) {
    params.set('sprint', 'off')
  }
  if (!scenario.fl) {
    params.set('fl', 'off')
  }

  if (scenario.system === 'custom') {
    const custom = scenario.custom ?? createDefaultCustomConfig()
    params.set('custom', custom.racePoints.map(formatPoints).join(','))
    if (custom.fastestLap) {
      params.set('customFl', 'on')
    }
    if (custom.sprint !== 'none') {
      params.set('customSprint', custom.sprint)
    }
    if (custom.bestResults !== null) {
      params.set('customBest', String(custom.bestResults))
    }
  }

  return params
}

export function countActive(scenario: Scenario): number {
  let count = 0
  count += scenario.exclude.length
  count += scenario.skip.length
  if (!scenario.sprint) {
    count += 1
  }
  if (!scenario.fl) {
    count += 1
  }
  if (scenario.preset !== 'historical') {
    count += 1
  }
  if (scenario.system === 'custom') {
    count += 1
  }
  return count
}

export function countActivePayload(payload: ScenarioPayload, system?: string): number {
  let count = 0
  count += payload.excludedDrivers.length
  count += payload.skippedRounds.length
  if (!payload.sprints) {
    count += 1
  }
  if (!payload.fastestLap) {
    count += 1
  }
  if (payload.preset !== 'historical') {
    count += 1
  }
  if (payload.custom !== null || system === 'custom') {
    count += 1
  }
  return count
}

export function isDefaultScenario(scenario: Scenario): boolean {
  return countActive(scenario) === 0
}

export function scenarioForYearChange(
  current: Scenario,
  hasExplicitSystem: boolean,
  nextYear: number,
): Scenario {
  return {
    ...current,
    system: hasExplicitSystem ? current.system : defaultSystemForYear(nextYear),
    exclude: [],
    skip: [],
  }
}

export function customFromRules(rules: RulesSummary): CustomSystemConfig {
  const racePoints =
    rules.racePoints.length > 0 ? [...rules.racePoints] : [...DEFAULT_CUSTOM_POINTS]
  const fastestLap = rules.fastestLap !== null

  let sprint: CustomSprintMode = 'none'
  if (rules.sprintPoints.length === 8) {
    sprint = '8'
  } else if (
    rules.sprintPoints.length === 3 &&
    rules.sprintPoints[0] === 3 &&
    rules.sprintPoints[1] === 2 &&
    rules.sprintPoints[2] === 1
  ) {
    sprint = '321'
  }

  const bestResults =
    rules.bestResults.type === 'season' &&
    rules.bestResults.count >= 1 &&
    rules.bestResults.count <= 40
      ? rules.bestResults.count
      : null

  return {
    racePoints,
    fastestLap,
    sprint,
    bestResults,
  }
}

export function formatRulesDescription(systemId: string, rules: RulesSummary): string {
  const prefix = systemId === 'custom' ? 'Custom' : `${systemId} rules`
  const parts: string[] = [prefix]

  if (rules.racePoints.length > 0) {
    parts.push(rules.racePoints.map(formatPoints).join('-'))
  }

  if (rules.fastestLap !== null) {
    const pts = formatPoints(rules.fastestLap.points)
    if (rules.fastestLap.maxPosition !== null && rules.fastestLap.maxPosition > 0) {
      parts.push(`fastest lap +${pts} (top ${rules.fastestLap.maxPosition})`)
    } else {
      parts.push(`fastest lap +${pts}`)
    }
  }

  if (rules.sprintPoints.length > 0) {
    parts.push(`sprint ${rules.sprintPoints.map(formatPoints).join('-')}`)
  }

  if (rules.bestResults.type === 'season') {
    parts.push(`best ${rules.bestResults.count}`)
  } else if (rules.bestResults.type === 'halves') {
    parts.push(
      `best ${rules.bestResults.firstCount}/${rules.bestResults.firstHalfRaces} + ${rules.bestResults.secondCount}`,
    )
  }

  return parts.join(' · ')
}
