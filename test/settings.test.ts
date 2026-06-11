import { describe, expect, it } from "vitest"
import { DEFAULT_SETTINGS, mergeSettings } from "../src/core/settings.js"

describe("mergeSettings", () => {
  it("returns defaults for non-object input", () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(mergeSettings("garbage")).toEqual(DEFAULT_SETTINGS)
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
  })

  it("keeps valid fields and defaults the rest", () => {
    const merged = mergeSettings({ detectionGrid: 2, trackName: "Chords", colorMode: "solid" })
    expect(merged.detectionGrid).toBe(2)
    expect(merged.trackName).toBe("Chords")
    expect(merged.colorMode).toBe("solid")
    expect(merged.guideRangeLow).toBe(DEFAULT_SETTINGS.guideRangeLow)
    expect(merged.tonicHue).toBe(DEFAULT_SETTINGS.tonicHue)
  })

  it("rejects invalid values per field", () => {
    const merged = mergeSettings({ detectionGrid: 3, guideRangeLow: 1.5, trackName: "  ", colorMode: "rainbow" })
    expect(merged.detectionGrid).toBe("auto")
    expect(merged.guideRangeLow).toBe(DEFAULT_SETTINGS.guideRangeLow)
    expect(merged.trackName).toBe("Harmony")
    expect(merged.colorMode).toBe("function")
  })

  it("clamps and orders the guide range", () => {
    const merged = mergeSettings({ guideRangeLow: 200, guideRangeHigh: 10 })
    expect(merged.guideRangeLow).toBe(10)
    expect(merged.guideRangeHigh).toBe(127)
  })

  it("clamps color options", () => {
    const merged = mergeSettings({ tonicHue: 400, diatonicStep: 100, solidHue: -20 })
    expect(merged.tonicHue).toBe(359)
    expect(merged.diatonicStep).toBe(48)
    expect(merged.solidHue).toBe(0)
  })

  it("maps the legacy colorByFunction boolean onto colorMode", () => {
    expect(mergeSettings({ colorByFunction: false }).colorMode).toBe("off")
    expect(mergeSettings({ colorByFunction: true }).colorMode).toBe("function")
    expect(mergeSettings({ colorByFunction: false, colorMode: "solid" }).colorMode).toBe("solid")
  })

  it("drops unknown fields from newer versions", () => {
    const merged = mergeSettings({ futureFeature: true })
    expect(merged).toEqual(DEFAULT_SETTINGS)
  })
})
