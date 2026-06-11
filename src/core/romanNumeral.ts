import { Chord, Note } from "tonal"
import type { KeyContext } from "./types.js"

const DEGREE_TABLE = ["I", "bII", "II", "bIII", "III", "IV", "bV", "V", "bVI", "VI", "bVII", "VII"]

export function romanNumeral(chordSymbol: string, key: KeyContext): string | null {
  const chord = Chord.get(chordSymbol)
  if (chord.empty || !chord.tonic) return null
  const chroma = Note.chroma(chord.tonic)
  if (chroma == null) return null

  const interval = (chroma - key.rootChroma + 12) % 12
  let base = DEGREE_TABLE[interval]
  if (interval === 6 && key.scaleIntervals.includes(6)) base = "#IV"

  const has = (iv: string) => chord.intervals.includes(iv)
  if (has("3m") && has("5d")) {
    return base.toLowerCase() + (has("7d") ? "°7" : has("7m") ? "ø7" : "°")
  }
  if (has("3M") && has("5A")) return base + "+"

  const numeral = has("3m") ? base.toLowerCase() : base
  return numeral + qualitySuffix(chord.aliases[0] ?? "")
}

function qualitySuffix(alias: string): string {
  if (alias === "M" || alias === "m" || alias === "") return ""
  if (alias.startsWith("maj")) return alias
  if (alias.startsWith("m")) return alias.slice(1)
  return alias
}

// "A7 → Dm" in C major is V7/ii, not VI7: a non-diatonic major/dominant chord
// resolving down a perfect fifth into the next region is an applied dominant
export function secondaryDominant(chordSymbol: string, nextSymbol: string, key: KeyContext): string | null {
  const chord = Chord.get(chordSymbol)
  const next = Chord.get(nextSymbol)
  if (chord.empty || !chord.tonic || next.empty || !next.tonic) return null

  const rootChroma = Note.chroma(chord.tonic)
  const nextChroma = Note.chroma(next.tonic)
  if (rootChroma == null || nextChroma == null) return null

  const isDominantQuality =
    chord.intervals.includes("3M") &&
    !chord.intervals.includes("5A") &&
    chord.intervals.every(iv => iv !== "7M")
  if (!isDominantQuality) return null

  const scale = new Set(key.scaleIntervals.map(i => (key.rootChroma + i) % 12))
  const chromas = chord.notes.map(n => Note.chroma(n)).filter((c): c is number => c != null)
  const diatonic = chromas.every(c => scale.has(c))
  if (diatonic) return null // a plain V7 etc. keeps its ordinary numeral

  if ((rootChroma - 7 + 12) % 12 !== nextChroma) return null // must resolve down a fifth
  if (nextChroma === key.rootChroma) return null // resolving to the tonic is just V

  const targetTriad = next.tonic + (next.intervals.includes("3m") ? "m" : "")
  const target = romanNumeral(targetTriad, key)
  if (!target) return null

  const seventh = chord.intervals.includes("7m") ? "7" : ""
  return `V${seventh}/${target}`
}
