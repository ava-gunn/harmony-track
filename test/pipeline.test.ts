import { describe, expect, it } from "vitest"
import { analyzeClip, analyzeNotes, placeClip } from "../src/core/pipeline.js"
import { C_MAJOR, chordNotes, clipView, note } from "./helpers.js"

// |Cmaj Am F G| — one chord per bar, 16 beats
const progression = [
  ...chordNotes([60, 64, 67], 0, 4),
  ...chordNotes([57, 60, 64], 4, 4),
  ...chordNotes([53, 57, 60], 8, 4),
  ...chordNotes([55, 59, 62], 12, 4),
]

describe("analyzeClip", () => {
  it("detects a four-chord progression with names and numerals", () => {
    const regions = analyzeClip(clipView(progression), C_MAJOR, 16)
    expect(regions).toMatchObject([
      { startBeat: 0, endBeat: 4, chord: "Cmaj", numeral: "I" },
      { startBeat: 4, endBeat: 8, chord: "Am", numeral: "vi" },
      { startBeat: 8, endBeat: 12, chord: "Fmaj", numeral: "IV" },
      { startBeat: 12, endBeat: 16, chord: "Gmaj", numeral: "V" },
    ])
  })

  it("survives passing tones and a sustained pad", () => {
    const withExtras = [
      ...progression,
      note(72, 1.1, 0.2), // ornament inside Cmaj, drops in quantize
      note(67, 4, 4), // sustained G over the Am bar turns it into Am7
    ]
    const regions = analyzeClip(clipView(withExtras), C_MAJOR, 16)
    expect(regions.map(r => r.chord)).toEqual(["Cmaj", "Am7", "Fmaj", "Gmaj"])
  })

  it("omits numerals when no key is set", () => {
    const regions = analyzeClip(clipView(progression), null, 16)
    expect(regions.every(r => r.numeral === null)).toBe(true)
    expect(regions[0].chord).toBe("Cmaj")
  })

  it("returns no regions for an empty clip", () => {
    expect(analyzeClip(clipView([]), C_MAJOR, 16)).toEqual([])
  })

  it("returns no regions for a monophonic melody", () => {
    const melody = [note(60, 0, 1), note(62, 1, 1), note(64, 2, 1), note(65, 3, 1)]
    expect(analyzeClip(clipView(melody, { endMarker: 4 }), C_MAJOR, 4)).toEqual([])
  })

  it("rebases regions when startMarker is offset", () => {
    const offset = clipView(
      chordNotes([60, 64, 67], 4, 4),
      { startMarker: 4, endMarker: 8 }
    )
    expect(analyzeClip(offset, C_MAJOR, 4)).toMatchObject([
      { startBeat: 0, endBeat: 4, chord: "Cmaj", numeral: "I" },
    ])
  })

  it("tiles a looping clip across the target duration", () => {
    const looped = clipView(chordNotes([60, 64, 67], 0, 2).concat(chordNotes([55, 59, 62], 2, 2)), {
      looping: true,
      loopEnd: 4,
      endMarker: 4,
    })
    const regions = analyzeClip(looped, C_MAJOR, 8)
    expect(regions.map(r => [r.startBeat, r.endBeat, r.chord])).toEqual([
      [0, 2, "Cmaj"],
      [2, 4, "Gmaj"],
      [4, 6, "Cmaj"],
      [6, 8, "Gmaj"],
    ])
  })

  it("merges identical chords across the loop seam", () => {
    const looped = clipView(chordNotes([60, 64, 67], 0, 4), { looping: true, loopEnd: 4, endMarker: 4 })
    expect(analyzeClip(looped, C_MAJOR, 12)).toMatchObject([
      { startBeat: 0, endBeat: 12, chord: "Cmaj", numeral: "I" },
    ])
  })

  it("ignores notes outside the active window", () => {
    const view = clipView(
      [...chordNotes([60, 64, 67], 0, 4), ...chordNotes([55, 59, 62], 4, 4)],
      { looping: true, loopEnd: 4, endMarker: 8 }
    )
    const regions = analyzeClip(view, C_MAJOR, 4)
    expect(regions).toMatchObject([{ startBeat: 0, endBeat: 4, chord: "Cmaj", numeral: "I" }])
  })
})

describe("placeClip", () => {
  it("offsets notes to the anchor position", () => {
    const placed = placeClip(clipView([note(60, 0, 4)], { endMarker: 4 }), 16, 4)
    expect(placed).toEqual([note(60, 16, 4)])
  })

  it("unrolls loop passes and clamps the last to the target duration", () => {
    const view = clipView([note(60, 0, 4)], { looping: true, loopEnd: 4, endMarker: 4 })
    expect(placeClip(view, 0, 10)).toEqual([note(60, 0, 4), note(60, 4, 4), note(60, 8, 2)])
  })
})

describe("analyzeNotes options", () => {
  it("detects mid-bar changes at a finer grid and merges at a coarser one", () => {
    // chord change at beat 2: |C C G G| within one bar
    const notes = [...chordNotes([60, 64, 67], 0, 2), ...chordNotes([55, 59, 62], 2, 2)]
    expect(analyzeNotes(notes, 0, 4, null, { gridBeats: 2 }).map(r => [r.startBeat, r.endBeat, r.chord])).toEqual([
      [0, 2, "Cmaj"],
      [2, 4, "Gmaj"],
    ])
    expect(analyzeNotes(notes, 0, 4, null, { gridBeats: 0.5 })).toHaveLength(2)
  })

  it("labels secondary dominants from region context", () => {
    // |Cmaj | A7 | Dm | G7| — A7 is V7/ii, G7 stays V7
    const notes = [
      ...chordNotes([60, 64, 67], 0, 4),
      ...chordNotes([57, 61, 64, 67], 4, 4),
      ...chordNotes([50, 53, 57], 8, 4),
      ...chordNotes([55, 59, 62, 65], 12, 4),
    ]
    const numerals = analyzeNotes(notes, 0, 16, C_MAJOR).map(r => r.numeral)
    expect(numerals).toEqual(["I", "V7/ii", "ii", "V7"])
  })

  it("labels secondary dominants only when the resolution is in view", () => {
    // |Cmaj | A7| — no next region, so A7 keeps its scale-degree numeral
    const notes = [...chordNotes([60, 64, 67], 0, 4), ...chordNotes([57, 61, 64, 67], 4, 4)]
    expect(analyzeNotes(notes, 0, 8, C_MAJOR)[1].numeral).toBe("VI7")
    expect(analyzeNotes(notes, 0, 8, C_MAJOR, { secondaryDominants: false })[1].numeral).toBe("VI7")
  })

  it("disabling secondary dominants keeps scale-degree numerals even on resolution", () => {
    // |A7 | Dm| — resolution in view, but the setting is off
    const notes = [...chordNotes([57, 61, 64, 67], 0, 4), ...chordNotes([50, 53, 57], 4, 4)]
    expect(analyzeNotes(notes, 0, 8, C_MAJOR, { secondaryDominants: false })[0].numeral).toBe("VI7")
    expect(analyzeNotes(notes, 0, 8, C_MAJOR)[0].numeral).toBe("V7/ii")
  })

  it("attaches scale suggestions to each region", () => {
    const regions = analyzeNotes(progression, 0, 16, C_MAJOR)
    expect(regions[1].scales[0]).toBe("A Minor") // Am in C major → A aeolian
    expect(regions.every(r => r.scales.length > 0 && r.scales.length <= 3)).toBe(true)
  })

  it("passes color options through to region colors", () => {
    const notes = chordNotes([60, 64, 67], 0, 4)
    const blue = analyzeNotes(notes, 0, 4, C_MAJOR)[0].color
    const shifted = analyzeNotes(notes, 0, 4, C_MAJOR, { tonicHue: 100 })[0].color
    expect(shifted).not.toBe(blue)
  })
})

describe("analyzeNotes across multiple clips", () => {
  it("combines stacked clips into one harmony (chords + bass)", () => {
    // chord clip plays C E G, a separate bass clip adds the A that makes it Am7
    const chords = placeClip(clipView(chordNotes([60, 64, 67], 0, 4), { endMarker: 4 }), 8, 4)
    const bass = placeClip(clipView([note(45, 0, 4)], { endMarker: 4 }), 8, 4)
    const regions = analyzeNotes([...chords, ...bass], 8, 12, C_MAJOR)
    expect(regions).toMatchObject([{ startBeat: 8, endBeat: 12, chord: "Am7", numeral: "vi7" }])
  })

  it("keeps a gap between non-adjacent clips", () => {
    const first = placeClip(clipView(chordNotes([60, 64, 67], 0, 4), { endMarker: 4 }), 0, 4)
    const second = placeClip(clipView(chordNotes([55, 59, 62], 0, 4), { endMarker: 4 }), 8, 4)
    const regions = analyzeNotes([...first, ...second], 0, 12, C_MAJOR)
    expect(regions).toMatchObject([
      { startBeat: 0, endBeat: 4, chord: "Cmaj", numeral: "I" },
      { startBeat: 8, endBeat: 12, chord: "Gmaj", numeral: "V" },
    ])
  })
})
