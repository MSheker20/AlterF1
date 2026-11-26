export type Health = {
  status: string
  service: string
  version: string
}

const TIMEOUT_MS = 5000

export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const res = await fetch('/api/v1/health', {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const body = (await res.json()) as Partial<Health>
  if (body.status !== 'UP' || typeof body.version !== 'string') {
    throw new Error(`Unexpected health payload: status=${String(body.status)}`)
  }
  return body as Health
}
