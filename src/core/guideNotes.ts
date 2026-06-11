import { Chord, Note } from "tonal"

export interface GuideNote {
  pitch: number
  startTime: number
  duration: number
  velocity: number
}

export interface GuideOptions {
  low?: number
  high?: number
}

// Live names these C2–C5 (middle C = C3 = 60): bass through high lead,
// keeping the guide clips out of the unused extremes of the piano roll
export const MIN_GUIDE_PITCH = 48
export const MAX_GUIDE_PITCH = 84

const GUIDE_VELOCITY = 127

export function guideNotes(chordSymbol: string, durationBeats: number, opts: GuideOptions = {}): GuideNote[] {
  const low = opts.low ?? MIN_GUIDE_PITCH
  const high = opts.high ?? MAX_GUIDE_PITCH

  const chromas = new Set(
    Chord.get(chordSymbol)
      .notes.map(n => Note.chroma(n))
      .filter((c): c is number => c != null)
  )

  const notes: GuideNote[] = []
  for (let pitch = low; pitch <= high; pitch++) {
    if (chromas.has(pitch % 12)) {
      notes.push({ pitch, startTime: 0, duration: durationBeats, velocity: GUIDE_VELOCITY })
    }
  }
  return notes
}
