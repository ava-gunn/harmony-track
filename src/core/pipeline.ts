import { chordColor } from "./chordColor.js"
import { beatPitches, detectBeatChord } from "./chordDetect.js"
import { quantizeNotes } from "./quantize.js"
import { mergeRegions } from "./regions.js"
import { romanNumeral, secondaryDominant } from "./romanNumeral.js"
import type { ChordRegion, ClipView, DetectedChord, KeyContext, SimpleNote } from "./types.js"

export function activeWindowLength(view: ClipView): number {
  const end = view.looping ? view.loopEnd : view.endMarker
  return Math.max(0, end - view.startMarker)
}

// Expands a clip into notes on the absolute timeline: windows to the active
// content, rebases to anchorBeat, and unrolls loop passes across targetDuration
export function placeClip(view: ClipView, anchorBeat: number, targetDuration: number): SimpleNote[] {
  const windowStart = view.startMarker
  const windowEnd = view.looping ? view.loopEnd : view.endMarker
  const windowLength = windowEnd - windowStart
  if (windowLength <= 0 || targetDuration <= 0) return []

  const windowed = view.notes
    .filter(n => n.startTime < windowEnd && n.startTime + n.duration > windowStart)
    .map(n => {
      const start = Math.max(n.startTime, windowStart)
      const end = Math.min(n.startTime + n.duration, windowEnd)
      return { pitch: n.pitch, startTime: start - windowStart, duration: end - start }
    })

  const passes = view.looping ? Math.ceil(targetDuration / windowLength) : 1
  const placed: SimpleNote[] = []
  for (let pass = 0; pass < passes; pass++) {
    const offset = anchorBeat + pass * windowLength
    for (const n of windowed) {
      const start = offset + n.startTime
      const end = Math.min(start + n.duration, anchorBeat + targetDuration)
      if (end > start) placed.push({ pitch: n.pitch, startTime: start, duration: end - start })
    }
  }
  return placed
}

export interface AnalyzeOptions {
  gridBeats?: number
  secondaryDominants?: boolean
  tonicHue?: number
  diatonicStep?: number
}

export function analyzeNotes(
  notes: SimpleNote[],
  startBeat: number,
  endBeat: number,
  key: KeyContext | null,
  opts: AnalyzeOptions = {}
): ChordRegion[] {
  if (endBeat <= startBeat || notes.length === 0) return []
  const grid = opts.gridBeats ?? 1
  const colorOpts = { tonicHue: opts.tonicHue, diatonicStep: opts.diatonicStep }

  const quantized = quantizeNotes(notes, grid)
  const windows = beatPitches(quantized, startBeat, endBeat, grid)

  let prev: DetectedChord | null = null
  const windowChords = windows.map(pitches => (prev = detectBeatChord(pitches, prev)))

  const regions = mergeRegions(windowChords).map(r => ({
    startBeat: startBeat + r.startBeat * grid,
    endBeat: Math.min(startBeat + r.endBeat * grid, endBeat),
    chord: r.chord.symbol,
    numeral: key ? romanNumeral(r.chord.symbol, key) : null,
    color: key ? chordColor(r.chord.symbol, key, colorOpts) : null,
  }))

  if (!key || opts.secondaryDominants === false) return regions
  return regions.map((r, i) => {
    const next = regions[i + 1]
    if (!next || next.startBeat !== r.endBeat) return r
    const secondary = secondaryDominant(r.chord, next.chord, key)
    return secondary ? { ...r, numeral: secondary } : r
  })
}

export function analyzeClip(
  view: ClipView,
  key: KeyContext | null,
  targetDuration: number,
  opts: AnalyzeOptions = {}
): ChordRegion[] {
  return analyzeNotes(placeClip(view, 0, targetDuration), 0, Math.ceil(targetDuration), key, opts)
}
