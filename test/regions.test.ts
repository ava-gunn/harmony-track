import { describe, expect, it } from "vitest"
import { mergeRegions } from "../src/core/regions.js"
import type { DetectedChord } from "../src/core/types.js"

const chord = (symbol: string): DetectedChord => ({ symbol, chromas: new Set() })

describe("mergeRegions", () => {
  it("merges consecutive identical chords", () => {
    const c = chord("Cmaj")
    expect(mergeRegions([c, c, c, c])).toMatchObject([{ startBeat: 0, endBeat: 4 }])
  })

  it("splits on chord change", () => {
    expect(mergeRegions([chord("Cmaj"), chord("Cmaj"), chord("G7"), chord("G7")])).toMatchObject([
      { startBeat: 0, endBeat: 2, chord: { symbol: "Cmaj" } },
      { startBeat: 2, endBeat: 4, chord: { symbol: "G7" } },
    ])
  })

  it("leaves a gap on rests and does not merge across them", () => {
    expect(mergeRegions([chord("Cmaj"), null, chord("Cmaj")])).toMatchObject([
      { startBeat: 0, endBeat: 1 },
      { startBeat: 2, endBeat: 3 },
    ])
  })
})
