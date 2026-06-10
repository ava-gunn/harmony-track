import { Chord, Note } from "tonal"

export interface GuideNote {
  pitch: number
  startTime: number
  duration: number
  velocity: number
}

// Live names these C1–C6 (middle C = C3 = 60): bass through high lead,
// keeping the guide clips out of the unused extremes of the piano roll
export const MIN_GUIDE_PITCH = 36
export const MAX_GUIDE_PITCH = 96

export function guideNotes(chordSymbol: string, durationBeats: number): GuideNote[] {
  const chromas = new Set(
    Chord.get(chordSymbol)
      .notes.map(n => Note.chroma(n))
      .filter((c): c is number => c != null)
  )
  const notes: GuideNote[] = []
  for (let pitch = MIN_GUIDE_PITCH; pitch <= MAX_GUIDE_PITCH; pitch++) {
    if (chromas.has(pitch % 12)) {
      notes.push({ pitch, startTime: 0, duration: durationBeats, velocity: 100 })
    }
  }
  return notes
}
