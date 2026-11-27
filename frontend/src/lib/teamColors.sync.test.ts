import { describe, expect, it } from 'vitest'
import backendCopy from '../../../backend/src/main/resources/og/team-colors.json'
import { KNOWN_TEAM_COLORS } from './teamColors'

// The backend draws the same colours into link-preview images (og/team-colors.json).
describe('team colours shared with the backend', () => {
  it('match the backend copy exactly', () => {
    expect(backendCopy).toEqual(KNOWN_TEAM_COLORS)
  })
})
