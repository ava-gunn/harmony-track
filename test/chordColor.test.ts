import { describe, expect, it } from "vitest"
import { chordColor, chordHue, solidColor } from "../src/core/chordColor.js"
import { C_MAJOR } from "./helpers.js"

const hue = (symbol: string) => chordHue(symbol, C_MAJOR)!

describe("chordHue in C major", () => {
  it("anchors the tonic at blue", () => {
    expect(hue("Cmaj")).toBe(220)
  })

  it("gives every diatonic degree a distinct hue", () => {
    const hues = ["Cmaj", "Dm", "Em", "Fmaj", "G7", "Am", "Bdim"].map(hue)
    const minGap = Math.min(
      ...hues.flatMap((a, i) => hues.slice(i + 1).map(b => Math.abs(a - b)))
    )
    expect(minGap).toBeGreaterThanOrEqual(20)
  })

  it("walks the sharp side toward red by fifths", () => {
    const sharpSide = ["Cmaj", "G7", "Dm", "Am", "Em", "Bdim"].map(hue)
    for (let i = 1; i < sharpSide.length; i++) {
      expect(sharpSide[i]).toBeLessThan(sharpSide[i - 1])
    }
  })

  it("walks the flat side through violet toward red", () => {
    expect(hue("Fmaj")).toBeGreaterThan(hue("Cmaj"))
    expect(hue("Bb")).toBeGreaterThan(hue("Fmaj"))
    expect(hue("Eb")).toBeGreaterThan(hue("Bb"))
  })

  it("separates diatonic vi from borrowed iv", () => {
    expect(Math.abs(hue("Am") - hue("Fm"))).toBeGreaterThan(60)
  })

  it("makes borrowed chords decisively warmer than diatonic chords on the same root", () => {
    expect(hue("Fm")).toBeGreaterThan(hue("Fmaj")) // further along the flat side
    expect(Math.abs(hue("Fm") - hue("Fmaj"))).toBeGreaterThan(40) // survives palette snapping
    const distanceFromTonic = (h: number) => Math.min(Math.abs(h - 220), 360 - Math.abs(h - 220))
    expect(distanceFromTonic(hue("Fm"))).toBeGreaterThan(distanceFromTonic(hue("Fmaj")))
  })

  it("pushes secondary dominants well past their diatonic root degree", () => {
    expect(Math.abs(hue("E7") - hue("Em"))).toBeGreaterThan(40) // V/vi vs iii
  })

  it("converges on red at the chromatic tritone", () => {
    expect(hue("F#")).toBe(0)
  })

  it("returns null for unparseable symbols", () => {
    expect(chordHue("???", C_MAJOR)).toBeNull()
  })
})

describe("chordColor", () => {
  it("returns a valid packed RGB number", () => {
    const color = chordColor("Cmaj", C_MAJOR)!
    expect(Number.isInteger(color)).toBe(true)
    expect(color).toBeGreaterThanOrEqual(0)
    expect(color).toBeLessThanOrEqual(0xffffff)
  })

  it("gives the tonic a cool (blue-dominant) color", () => {
    const color = chordColor("Cmaj", C_MAJOR)!
    const [r, b] = [(color >> 16) & 0xff, color & 0xff]
    expect(b).toBeGreaterThan(r)
  })

  it("gives distant chords a warm (red-dominant) color", () => {
    const color = chordColor("F#", C_MAJOR)!
    const [r, b] = [(color >> 16) & 0xff, color & 0xff]
    expect(r).toBeGreaterThan(b)
  })

  it("returns null for unparseable symbols", () => {
    expect(chordColor("???", C_MAJOR)).toBeNull()
  })
})

describe("solidColor", () => {
  it("matches the function-color rendering of the same hue", () => {
    expect(solidColor(220)).toBe(chordColor("Cmaj", C_MAJOR))
  })

  it("renders red at hue 0", () => {
    const color = solidColor(0)
    expect((color >> 16) & 0xff).toBeGreaterThan(color & 0xff)
  })
})
