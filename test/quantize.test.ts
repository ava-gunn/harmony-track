import { describe, expect, it } from "vitest"
import { quantizeNotes } from "../src/core/quantize.js"
import { note } from "./helpers.js"

describe("quantizeNotes", () => {
  it("snaps start and end to the nearest beat", () => {
    expect(quantizeNotes([note(60, 0.1, 3.8)])).toEqual([note(60, 0, 4)])
    expect(quantizeNotes([note(60, 0.6, 1.0)])).toEqual([note(60, 1, 1)])
  })

  it("drops notes that round to zero length", () => {
    expect(quantizeNotes([note(60, 0.1, 0.2)])).toEqual([])
    expect(quantizeNotes([note(60, 1.9, 0.15)])).toEqual([])
  })

  it("keeps a 0.4-0.6 note that rounds to a full beat", () => {
    expect(quantizeNotes([note(60, 0.4, 0.6)])).toEqual([note(60, 0, 1)])
  })

  it("merges same-pitch notes that touch or overlap after snapping", () => {
    expect(quantizeNotes([note(60, 0, 1.1), note(60, 0.9, 1.1)])).toEqual([note(60, 0, 2)])
    expect(quantizeNotes([note(60, 0, 2), note(60, 1, 3)])).toEqual([note(60, 0, 4)])
  })

  it("does not merge different pitches", () => {
    expect(quantizeNotes([note(60, 0, 2), note(64, 0, 2)])).toEqual([note(60, 0, 2), note(64, 0, 2)])
  })

  it("respects a custom grid", () => {
    expect(quantizeNotes([note(60, 0.3, 0.45)], 0.5)).toEqual([note(60, 0.5, 0.5)])
  })
})
