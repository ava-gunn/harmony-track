import { describe, expect, it } from "vitest"
import { romanNumeral } from "../src/core/romanNumeral.js"
import { A_MINOR, C_MAJOR, F_LYDIAN } from "./helpers.js"

describe("romanNumeral in C major", () => {
  it.each([
    ["Cmaj", "I"],
    ["Dm7", "ii7"],
    ["Em", "iii"],
    ["Fmaj7", "IVmaj7"],
    ["G7", "V7"],
    ["Am", "vi"],
    ["Bdim", "vii°"],
    ["Bm7b5", "viiø7"],
    ["Bdim7", "vii°7"],
    ["Bb", "bVII"],
    ["Db", "bII"],
    ["Csus4", "Isus4"],
    ["Caug", "I+"],
    ["C5", "I5"],
    ["C6", "I6"],
    ["Cm6", "i6"],
  ])("%s → %s", (symbol, expected) => {
    expect(romanNumeral(symbol, C_MAJOR)).toBe(expected)
  })
})

describe("romanNumeral in A minor", () => {
  it.each([
    ["Am", "i"],
    ["G", "bVII"],
    ["E7", "V7"],
    ["F", "bVI"],
    ["Dm", "iv"],
  ])("%s → %s", (symbol, expected) => {
    expect(romanNumeral(symbol, A_MINOR)).toBe(expected)
  })
})

describe("romanNumeral in F Lydian", () => {
  it("labels the raised fourth as #IV", () => {
    expect(romanNumeral("B", F_LYDIAN)).toBe("#IV")
    expect(romanNumeral("Bm", F_LYDIAN)).toBe("#iv")
  })
})

describe("romanNumeral edge cases", () => {
  it("returns null for unparseable symbols", () => {
    expect(romanNumeral("???", C_MAJOR)).toBeNull()
  })
})
