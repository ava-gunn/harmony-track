import { Chord, Note } from "tonal"
import type { DetectedChord, SimpleNote } from "./types.js"

const EPS = 1e-6

export function beatPitches(notes: SimpleNote[], startBeat: number, endBeat: number, step = 1): number[][] {
  const windows: number[][] = []
  const count = Math.ceil((endBeat - startBeat) / step - EPS)
  for (let i = 0; i < count; i++) {
    const start = startBeat + i * step
    const sounding = notes.filter(n => n.startTime < start + step - EPS && n.startTime + n.duration > start + EPS)
    windows.push([...new Set(sounding.map(n => n.pitch))].sort((x, y) => x - y))
  }
  return windows
}

const SHARP_TO_FLAT: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
}

function pitchClassName(pitch: number): string {
  const pc = Note.pitchClass(Note.fromMidi(pitch))
  return SHARP_TO_FLAT[pc] ?? pc
}

function displaySymbol(symbol: string): string {
  return symbol.replace(/^([A-G](?:b|#)?)M(?![a-z])/, "$1maj")
}

export function detectBeatChord(pitches: number[], prev: DetectedChord | null): DetectedChord | null {
  if (pitches.length === 0) return null

  const chromas = [...new Set(pitches.map(p => p % 12))]
  if (prev && chromas.every(c => prev.chromas.has(c))) return prev
  if (chromas.length < 2) return null

  // pitches arrive sorted ascending, so the bass leads — Chord.detect is
  // order-sensitive and weighs the first note as the bass
  const candidates = Chord.detect([...new Set(pitches.map(pitchClassName))])
  if (candidates.length === 0) return null

  // tonal can rank altered oddities above plain inversions (Em#5 over CM/E);
  // prefer the candidate whose chord type carries the fewest alterations
  const alterations = (candidate: string) => {
    const type = candidate.split("/")[0].replace(/^[A-G](?:b|#)?/, "")
    return (type.match(/[#b]/g) ?? []).length
  }
  const picked = candidates.reduce((best, c) => (alterations(c) < alterations(best) ? c : best))

  const head = picked.split("/")[0]
  const tones = Chord.get(head)
    .notes.map(n => Note.chroma(n))
    .filter((c): c is number => c != null)

  return { symbol: displaySymbol(head), chromas: new Set(tones) }
}
