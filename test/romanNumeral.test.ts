import { describe, expect, it } from "vitest"
import { romanNumeral, secondaryDominant } from "../src/core/romanNumeral.js"
import { A_MINOR, C_MAJOR, C_MINOR, F_LYDIAN } from "./helpers.js"

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

describe("secondaryDominant in C major", () => {
  it("labels applied dominant sevenths", () => {
    expect(secondaryDominant("A7", "Dm", C_MAJOR)).toBe("V7/ii")
    expect(secondaryDominant("E7", "Am", C_MAJOR)).toBe("V7/vi")
    expect(secondaryDominant("D7", "G7", C_MAJOR)).toBe("V7/V")
  })

  it("labels applied major triads", () => {
    expect(secondaryDominant("D", "G", C_MAJOR)).toBe("V/V")
  })

  it("ignores diatonic dominants (plain V7 keeps its numeral)", () => {
    expect(secondaryDominant("G7", "Cmaj", C_MAJOR)).toBeNull()
  })

  it("ignores chords that do not resolve down a fifth", () => {
    expect(secondaryDominant("A7", "Bb", C_MAJOR)).toBeNull()
    expect(secondaryDominant("A7", "Gmaj", C_MAJOR)).toBeNull()
  })

  it("ignores non-dominant qualities", () => {
    expect(secondaryDominant("Am7", "Dm", C_MAJOR)).toBeNull() // minor
    expect(secondaryDominant("Fmaj7", "Bb", C_MAJOR)).toBeNull() // major seventh
  })

  it("treats a non-diatonic dominant resolving to the tonic as plain V", () => {
    // G7 in C natural minor carries B natural (non-diatonic) but is still just V7
    expect(secondaryDominant("G7", "Cm", C_MINOR)).toBeNull()
  })
})
