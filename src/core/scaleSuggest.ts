import { Chord, Note, Scale } from "tonal"
import type { KeyContext } from "./types.js"

// curated chord-scale candidates, in conventional preference order
const SCALE_TYPES: Array<{ type: string; display: string }> = [
  { type: "major", display: "Major" },
  { type: "dorian", display: "Dorian" },
  { type: "mixolydian", display: "Mixolydian" },
  { type: "aeolian", display: "Minor" },
  { type: "lydian", display: "Lydian" },
  { type: "phrygian", display: "Phrygian" },
  { type: "locrian", display: "Locrian" },
  { type: "melodic minor", display: "Melodic Minor" },
  { type: "harmonic minor", display: "Harmonic Minor" },
  { type: "lydian dominant", display: "Lydian Dominant" },
  { type: "altered", display: "Altered" },
  { type: "phrygian dominant", display: "Phrygian Dominant" },
  { type: "whole tone", display: "Whole Tone" },
  { type: "major pentatonic", display: "Major Pentatonic" },
  { type: "minor pentatonic", display: "Minor Pentatonic" },
]

const chordChromas = (symbol: string): number[] =>
  Chord.get(symbol)
    .notes.map(n => Note.chroma(n))
    .filter((c): c is number => c != null)

// Up to `count` playable scales over the chord, best first. A candidate must
// contain every chord tone; ranking favors overlap with the key's pitch set,
// then with the surrounding chords' tones, then conventional preference.
export function suggestScales(
  chordSymbol: string,
  key: KeyContext | null,
  neighborChords: string[] = [],
  count = 3
): string[] {
  const chord = Chord.get(chordSymbol)
  if (chord.empty || !chord.tonic) return []
  const tones = chordChromas(chordSymbol)
  if (tones.length === 0) return []

  const keyChromas = key ? new Set(key.scaleIntervals.map(i => (key.rootChroma + i) % 12)) : null
  const neighborChromas = new Set(neighborChords.flatMap(chordChromas))

  const scored = SCALE_TYPES.flatMap(({ type, display }, index) => {
    const scale = Scale.get(`${chord.tonic} ${type}`)
    if (scale.empty) return []
    const chromas = new Set(
      scale.notes.map(n => Note.chroma(n)).filter((c): c is number => c != null)
    )
    if (!tones.every(t => chromas.has(t))) return []

    const keyShared = keyChromas ? [...chromas].filter(c => keyChromas.has(c)).length : 0
    const neighborShared = [...neighborChromas].filter(c => chromas.has(c)).length
    const prior = (SCALE_TYPES.length - index) * 0.01
    return [{ name: `${chord.tonic} ${display}`, score: keyShared * 2 + neighborShared + prior }]
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(s => s.name)
}
