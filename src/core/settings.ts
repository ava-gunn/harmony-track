export const DETECTION_GRIDS = [0.25, 0.5, 1, 2, 4] as const
export type DetectionGrid = (typeof DETECTION_GRIDS)[number]

export interface Settings {
  detectionGrid: "auto" | DetectionGrid
  guideRangeLow: number
  guideRangeHigh: number
  scaleToneLayer: boolean
  colorByFunction: boolean
  tonicHue: number // 0-359, anchor hue for the tonic
  diatonicStep: number // hue degrees per diatonic fifths step
  trackName: string
}

export const DEFAULT_SETTINGS: Settings = {
  detectionGrid: "auto",
  guideRangeLow: 48,
  guideRangeHigh: 84,
  scaleToneLayer: true,
  colorByFunction: true,
  tonicHue: 220,
  diatonicStep: 24,
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
    scaleToneLayer: pick("scaleToneLayer", v => typeof v === "boolean"),
    colorByFunction: pick("colorByFunction", v => typeof v === "boolean"),
    tonicHue: pick("tonicHue", v => typeof v === "number" && Number.isFinite(v)),
    diatonicStep: pick("diatonicStep", v => typeof v === "number" && Number.isFinite(v)),
    trackName: pick("trackName", v => typeof v === "string" && v.trim().length > 0),
  }

  settings.guideRangeLow = clamp(settings.guideRangeLow, 0, 127)
  settings.guideRangeHigh = clamp(settings.guideRangeHigh, 0, 127)
  if (settings.guideRangeLow > settings.guideRangeHigh) {
    ;[settings.guideRangeLow, settings.guideRangeHigh] = [settings.guideRangeHigh, settings.guideRangeLow]
  }
  settings.tonicHue = clamp(Math.round(settings.tonicHue), 0, 359)
  settings.diatonicStep = clamp(Math.round(settings.diatonicStep), 8, 48)
  settings.trackName = settings.trackName.trim()
  return settings
}
