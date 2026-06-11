import { Chord, Note } from "tonal"
import type { KeyContext } from "./types.js"

export interface GuideNote {
  pitch: number
  startTime: number
  duration: number
  velocity: number
}

export interface GuideOptions {
  low?: number
  high?: number
  scaleToneLayer?: boolean
  key?: KeyContext | null
}

// Live names these C2–C5 (middle C = C3 = 60): bass through high lead,
// keeping the guide clips out of the unused extremes of the piano roll
export const MIN_GUIDE_PITCH = 48
export const MAX_GUIDE_PITCH = 84

// maximum contrast in the piano roll's velocity shading:
// chord tones full, in-key non-chord tones at a whisper
const CHORD_TONE_VELOCITY = 127
const SCALE_TONE_VELOCITY = 1

export function guideNotes(chordSymbol: string, durationBeats: number, opts: GuideOptions = {}): GuideNote[] {
  const low = opts.low ?? MIN_GUIDE_PITCH
  const high = opts.high ?? MAX_GUIDE_PITCH

  const velocityByChroma = new Map<number, number>()
  for (const name of Chord.get(chordSymbol).notes) {
    const chroma = Note.chroma(name)
    if (chroma != null) velocityByChroma.set(chroma, CHORD_TONE_VELOCITY)
  }

  if (opts.scaleToneLayer && opts.key) {
    for (const interval of opts.key.scaleIntervals) {
      const chroma = (opts.key.rootChroma + interval) % 12
      if (!velocityByChroma.has(chroma)) velocityByChroma.set(chroma, SCALE_TONE_VELOCITY)
    }
  }

  const notes: GuideNote[] = []
  for (let pitch = low; pitch <= high; pitch++) {
    const velocity = velocityByChroma.get(pitch % 12)
    if (velocity != null) notes.push({ pitch, startTime: 0, duration: durationBeats, velocity })
  }
  return notes
}
