import type { DetectedChord } from "./types.js"

export interface RawRegion {
  startBeat: number
  endBeat: number
  chord: DetectedChord
}

export function mergeRegions(beatChords: (DetectedChord | null)[]): RawRegion[] {
  const regions: RawRegion[] = []
  beatChords.forEach((chord, beat) => {
    if (!chord) return
    const prev = regions[regions.length - 1]
    if (prev && prev.endBeat === beat && prev.chord.symbol === chord.symbol) {
      prev.endBeat = beat + 1
    } else {
      regions.push({ startBeat: beat, endBeat: beat + 1, chord })
    }
  })
  return regions
}
