import { describe, expect, it } from 'vitest'
import en from './en.json'
import tr from './tr.json'
import { languageFromPath, localizePath, switchLanguagePath } from './index'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keys(value as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('translations', () => {
  it('has the same keys in English and Turkish', () => {
    expect(keys(tr).sort()).toEqual(keys(en).sort())
  })

  it('keeps every interpolation parameter in the Turkish text', () => {
    const flat = (obj: object) =>
      Object.fromEntries(
        keys(obj).map((k) => [k, k.split('.').reduce<unknown>((o, p) => (o as never)[p], obj)]),
      ) as Record<string, string>
    const params = (s: string) => [...s.matchAll(/{{(\w+)}}/g)].map((m) => m[1]).sort()
    const enFlat = flat(en)
    const trFlat = flat(tr)
    for (const key of Object.keys(enFlat)) {
      expect(params(trFlat[key]), key).toEqual(params(enFlat[key]))
    }
  })
})

describe('language paths', () => {
  it('reads the language from the /tr prefix', () => {
    expect(languageFromPath('/')).toBe('en')
    expect(languageFromPath('/season/1988')).toBe('en')
    expect(languageFromPath('/tr')).toBe('tr')
    expect(languageFromPath('/tr/season/1988')).toBe('tr')
    expect(languageFromPath('/trivia')).toBe('en')
  })

  it('adds and strips the prefix', () => {
    expect(localizePath('/', 'tr')).toBe('/tr')
    expect(localizePath('/season/1988?system=1991', 'tr')).toBe('/tr/season/1988?system=1991')
    expect(localizePath('/about', 'en')).toBe('/about')
    expect(switchLanguagePath('/tr/season/1988/compare', 'en')).toBe('/season/1988/compare')
    expect(switchLanguagePath('/tr', 'en')).toBe('/')
    expect(switchLanguagePath('/about', 'tr')).toBe('/tr/about')
    // Never a protocol-relative link off the site.
    expect(switchLanguagePath('/tr//evil.com', 'en')).toBe('/evil.com')
  })
})
