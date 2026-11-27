import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { apiErrorText, badRequestMessage } from './apiErrors'
import i18n from './index'

describe('API error text', () => {
  const t = i18n.getFixedT('tr')
  const en = i18n.getFixedT('en')

  it('keeps the server wording in English', () => {
    const error = new ApiError(400, 'Bad request', "Unknown driver 'x' in 1988.", 'exclude')
    expect(apiErrorText(en, 'en', error)).toEqual({
      title: 'Bad request',
      detail: "Unknown driver 'x' in 1988.",
    })
  })

  it('translates by status and field in Turkish', () => {
    expect(apiErrorText(t, 'tr', new ApiError(404, 'Season not found', 'No data.')).title).toBe(
      'Sezon bulunamadı',
    )
    expect(badRequestMessage(t, 'tr', new ApiError(400, 'Bad request', 'x', 'skip'))).toBe(
      'Bu yarış çıkarılamaz: sezonda en az bir yarış kalmalı.',
    )
    expect(badRequestMessage(t, 'tr', new ApiError(400, 'Bad request', 'x', 'weird'))).toBe(
      'Bu senaryo hesaplanamadı.',
    )
    expect(apiErrorText(t, 'tr', new ApiError(500, 'Internal error', 'x')).title).toBe(
      'Sıralama yüklenemedi',
    )
  })
})
