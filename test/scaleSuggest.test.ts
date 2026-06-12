import { describe, expect, it } from "vitest"
import { suggestScales } from "../src/core/scaleSuggest.js"
import { A_MINOR, C_MAJOR } from "./helpers.js"

describe("suggestScales", () => {
  it("returns up to three candidates, best first", () => {
    const scales = suggestScales("Dm7", C_MAJOR, ["Cmaj", "G7"])
    expect(scales).toHaveLength(3)
    expect(scales[0]).toBe("D Dorian")
  })

  it("prefers the key's own mode for diatonic chords", () => {
    expect(suggestScales("G7", C_MAJOR, ["Dm7", "Cmaj"])[0]).toBe("G Mixolydian")
    expect(suggestScales("Cmaj", C_MAJOR)[0]).toBe("C Major")
    expect(suggestScales("Am", A_MINOR)[0]).toBe("A Minor")
  })

  it("only suggests scales containing every chord tone", () => {
    // every suggested scale for C7 must contain Bb — C major is excluded
    const scales = suggestScales("C7", C_MAJOR)
    expect(scales.length).toBeGreaterThan(0)
    expect(scales).not.toContain("C Major")
  })

  it("works without a key, ranked by neighbors and convention", () => {
    const scales = suggestScales("Dm7", null, ["G7"])
    expect(scales.length).toBeGreaterThan(0)
    expect(scales[0]).toMatch(/^D /)
  })

  it("returns empty for unparseable chords", () => {
    expect(suggestScales("???", C_MAJOR)).toEqual([])
  })
})
