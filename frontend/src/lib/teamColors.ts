export const KNOWN_TEAM_COLORS: Readonly<Record<string, string>> = {
  // Modern & iconic constructors
  ferrari: '#dc2626',
  mclaren: '#ff8000',
  williams: '#2563eb',
  'red-bull': '#3b5bdb',
  mercedes: '#00d2be',
  lotus: '#eab308',
  'lotus-f1': '#eab308',
  'team-lotus': '#15803d',
  brabham: '#38bdf8',
  tyrrell: '#6366f1',
  benetton: '#00a651',
  renault: '#facc15',
  alpine: '#2293d1',
  'aston-martin': '#229971',
  haas: '#b6babd',
  sauber: '#52e252',
  'kick-sauber': '#52e252',
  'bmw-sauber': '#60a5fa',
  'alfa-romeo': '#b91c1c',
  alphatauri: '#94a3b8',
  'racing-bulls': '#6692ff',
  'toro-rosso': '#4f7cff',
  'force-india': '#f472b6',
  'racing-point': '#f472b6',
  jordan: '#f5c518',
  minardi: '#a1887f',
  ligier: '#38a3f1',
  march: '#00b3c7',
  arrows: '#ff8c00',
  footwork: '#fb923c',
  cooper: '#16a34a',
  brm: '#15803d',
  maserati: '#e11d48',
  vanwall: '#166534',
  matra: '#2563eb',
  honda: '#e5e7eb',
  toyota: '#ef4444',
  bar: '#d1d5db',
  jaguar: '#10b981',
  stewart: '#cbd5e1',
  prost: '#1d4ed8',
  'super-aguri': '#f87171',
  spyker: '#f97316',
  midland: '#9ca3af',
  rial: '#60a5fa',
  osella: '#64748b',
  zakspeed: '#e11d48',
  lola: '#dc2626',
  surtees: '#f59e0b',
  hesketh: '#e2e8f0',
  shadow: '#94a3b8',
  wolf: '#ca8a04',
  fittipaldi: '#facc15',
  // Additional notable constructors across eras
  brawn: '#bef264',
  caterham: '#16a34a',
  marussia: '#ef4444',
  manor: '#ef4444',
  virgin: '#dc2626',
  hrt: '#a8a29e',
  'leyton-house': '#2dd4bf',
  larrousse: '#38bdf8',
  dallara: '#ef4444',
  onyx: '#60a5fa',
  porsche: '#cbd5e1',
  eagle: '#1d4ed8',
  ensign: '#f97316',
  gordini: '#3b82f6',
  audi: '#e11d48',
  cadillac: '#d4af37',
}

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100
  const l = lightness / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2

  let rPrime = 0
  let gPrime = 0
  let bPrime = 0

  if (hue < 60) {
    rPrime = c
    gPrime = x
  } else if (hue < 120) {
    rPrime = x
    gPrime = c
  } else if (hue < 180) {
    gPrime = c
    bPrime = x
  } else if (hue < 240) {
    gPrime = x
    bPrime = c
  } else if (hue < 300) {
    rPrime = x
    bPrime = c
  } else {
    rPrime = c
    bPrime = x
  }

  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(rPrime)}${toHex(gPrime)}${toHex(bPrime)}`
}

export function teamColor(constructorId: string): string {
  const normalized = constructorId.trim().toLowerCase()
  const known = KNOWN_TEAM_COLORS[normalized]
  if (known) {
    return known
  }
  const hue = hashString(normalized || 'unknown') % 360
  return hslToHex(hue, 62, 58)
}

export function isLight(hex: string): boolean {
  const cleaned = hex.trim().replace(/^#/, '')
  let r: number
  let g: number
  let b: number

  if (cleaned.length === 3) {
    r = Number.parseInt(cleaned[0] + cleaned[0], 16)
    g = Number.parseInt(cleaned[1] + cleaned[1], 16)
    b = Number.parseInt(cleaned[2] + cleaned[2], 16)
  } else if (cleaned.length === 6) {
    r = Number.parseInt(cleaned.slice(0, 2), 16)
    g = Number.parseInt(cleaned.slice(2, 4), 16)
    b = Number.parseInt(cleaned.slice(4, 6), 16)
  } else {
    return false
  }

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return false
  }

  const linearize = (channel: number) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }

  const luminance = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
  return luminance > 0.45
}
