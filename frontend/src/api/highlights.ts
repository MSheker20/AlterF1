import { useQuery } from '@tanstack/react-query'
import { getJson } from './client'
import type { Highlight } from './types'

export function fetchHighlights(signal?: AbortSignal): Promise<Highlight[]> {
  return getJson<Highlight[]>('/api/v1/highlights', signal)
}

/** Seasons whose champion changes under another system; computed once on the server. */
export function useHighlights() {
  return useQuery({
    queryKey: ['highlights'] as const,
    queryFn: ({ signal }) => fetchHighlights(signal),
    staleTime: Infinity,
  })
}
