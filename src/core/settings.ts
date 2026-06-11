export const DETECTION_GRIDS = [0.25, 0.5, 1, 2, 4] as const
export type DetectionGrid = (typeof DETECTION_GRIDS)[number]

export type ColorMode = "function" | "solid" | "off"

export interface Settings {
  detectionGrid: "auto" | DetectionGrid
  guideRangeLow: number
  guideRangeHigh: number
  colorMode: ColorMode
  tonicHue: number // 0-359, anchor hue for the tonic (function mode)
  diatonicStep: number // hue degrees per diatonic fifths step (function mode)
  solidHue: number // 0-359, clip color in solid mode
  trackName: string
}

export const DEFAULT_SETTINGS: Settings = {
  detectionGrid: "auto",
  guideRangeLow: 48,
  guideRangeHigh: 84,
  colorMode: "function",
  tonicHue: 220,
  diatonicStep: 24,
  solidHue: 220,
  trackName: "Harmony",
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

// Forward-compatible merge: wrong-typed/missing fields fall back to defaults,
// unknown fields from newer versions are dropped, ranges are clamped
export function mergeSettings(raw: unknown): Settings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
  const pick = <K extends keyof Settings>(k: K, ok: (v: unknown) => boolean): Settings[K] =>
    ok(r[k]) ? (r[k] as Settings[K]) : DEFAULT_SETTINGS[k]

  const settings: Settings = {
    detectionGrid: pick("detectionGrid", v => v === "auto" || DETECTION_GRIDS.includes(v as DetectionGrid)),
    guideRangeLow: pick("guideRangeLow", Number.isInteger),
    guideRangeHigh: pick("guideRangeHigh", Number.isInteger),
    colorMode: pick("colorMode", v => v === "function" || v === "solid" || v === "off"),
    tonicHue: pick("tonicHue", v => typeof v === "number" && Number.isFinite(v)),
    diatonicStep: pick("diatonicStep", v => typeof v === "number" && Number.isFinite(v)),
    solidHue: pick("solidHue", v => typeof v === "number" && Number.isFinite(v)),
    trackName: pick("trackName", v => typeof v === "string" && v.trim().length > 0),
  }

  // settings saved before colorMode existed used a colorByFunction boolean
  if (!("colorMode" in r) && r.colorByFunction === false) settings.colorMode = "off"

  settings.guideRangeLow = clamp(settings.guideRangeLow, 0, 127)
  settings.guideRangeHigh = clamp(settings.guideRangeHigh, 0, 127)
  if (settings.guideRangeLow > settings.guideRangeHigh) {
    ;[settings.guideRangeLow, settings.guideRangeHigh] = [settings.guideRangeHigh, settings.guideRangeLow]
  }
  settings.tonicHue = clamp(Math.round(settings.tonicHue), 0, 359)
  settings.diatonicStep = clamp(Math.round(settings.diatonicStep), 8, 48)
  settings.solidHue = clamp(Math.round(settings.solidHue), 0, 359)
  settings.trackName = settings.trackName.trim()
  return settings
}
