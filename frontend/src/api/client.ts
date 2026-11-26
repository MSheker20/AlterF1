import type { ProblemDetail } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly detail: string
  readonly field?: string

  constructor(status: number, title: string, detail: string, field?: string) {
    super(detail || title || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.detail = detail
    this.field = field
  }
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const init: RequestInit | undefined = signal ? { signal } : undefined
  const res = await fetch(url, init)

  if (!res.ok) {
    let title = res.statusText || `HTTP ${res.status}`
    let detail = ''
    let field: string | undefined

    if (typeof res.json === 'function') {
      try {
        const problem = (await res.json()) as ProblemDetail | null
        if (problem && typeof problem === 'object') {
          if (typeof problem.title === 'string' && problem.title.length > 0) {
            title = problem.title
          }
          if (typeof problem.detail === 'string' && problem.detail.length > 0) {
            detail = problem.detail
          }
          if (typeof problem.field === 'string' && problem.field.length > 0) {
            field = problem.field
          }
        }
      } catch {
        // Non-JSON error body; keep status fallback.
      }
    }

    throw new ApiError(res.status, title, detail, field)
  }

  return (await res.json()) as T
}
