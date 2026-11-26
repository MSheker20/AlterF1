import { describe, expect, it } from 'vitest'
import { deltaLabel, formatPoints } from './format'

describe('formatPoints', () => {
  it('formats whole numbers without decimals', () => {
    expect(formatPoints(0)).toBe('0')
    expect(formatPoints(-0)).toBe('0')
    expect(formatPoints(30)).toBe('30')
    expect(formatPoints(112.0)).toBe('112')
  })

  it('formats fractional points with up to two decimals and no trailing zeros', () => {
    expect(formatPoints(4.5)).toBe('4.5')
    expect(formatPoints(4.50)).toBe('4.5')
    expect(formatPoints(8.14)).toBe('8.14')
    expect(formatPoints(8.142857)).toBe('8.14')
    expect(formatPoints(8.146)).toBe('8.15')
    expect(formatPoints(0.5)).toBe('0.5')
  })

  it('handles non-finite numbers safely', () => {
    expect(formatPoints(Number.NaN)).toBe('0')
    expect(formatPoints(Number.POSITIVE_INFINITY)).toBe('0')
  })
})

describe('deltaLabel', () => {
  it('formats positive position gains', () => {
    expect(deltaLabel(1)).toEqual({
      text: '▲1',
      ariaLabel: 'gained 1 place',
      direction: 'up',
    })
    expect(deltaLabel(3)).toEqual({
      text: '▲3',
      ariaLabel: 'gained 3 places',
      direction: 'up',
    })
  })

  it('formats negative position losses', () => {
    expect(deltaLabel(-1)).toEqual({
      text: '▼1',
      ariaLabel: 'lost 1 place',
      direction: 'down',
    })
    expect(deltaLabel(-4)).toEqual({
      text: '▼4',
      ariaLabel: 'lost 4 places',
      direction: 'down',
    })
  })

  it('formats unchanged and null values', () => {
    expect(deltaLabel(0)).toEqual({
      text: '—',
      ariaLabel: 'position unchanged',
      direction: 'same',
    })
    expect(deltaLabel(null)).toEqual({
      text: '—',
      ariaLabel: 'position unchanged',
      direction: 'same',
    })
  })
})
