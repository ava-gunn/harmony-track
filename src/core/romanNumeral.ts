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

// a chord qualifies as an applied dominant when it is major/dominant quality
// and carries at least one out-of-scale tone (else it keeps its plain numeral)
function appliedDominantRoot(chordSymbol: string, key: KeyContext): { rootChroma: number; seventh: string } | null {
  const chord = Chord.get(chordSymbol)
  if (chord.empty || !chord.tonic) return null
  const rootChroma = Note.chroma(chord.tonic)
  if (rootChroma == null) return null

  const isDominantQuality =
    chord.intervals.includes("3M") &&
    !chord.intervals.includes("5A") &&
    chord.intervals.every(iv => iv !== "7M")
  if (!isDominantQuality) return null

  const scale = new Set(key.scaleIntervals.map(i => (key.rootChroma + i) % 12))
  const chromas = chord.notes.map(n => Note.chroma(n)).filter((c): c is number => c != null)
  if (chromas.every(c => scale.has(c))) return null

  return { rootChroma, seventh: chord.intervals.includes("7m") ? "7" : "" }
}

// "A7 → Dm" in C major is V7/ii, not VI7: a non-diatonic major/dominant chord
// resolving down a perfect fifth into the next region is an applied dominant
export function secondaryDominant(chordSymbol: string, nextSymbol: string, key: KeyContext): string | null {
  const dominant = appliedDominantRoot(chordSymbol, key)
  if (!dominant) return null

  const next = Chord.get(nextSymbol)
  if (next.empty || !next.tonic) return null
  const nextChroma = Note.chroma(next.tonic)
  if (nextChroma == null) return null

  if ((dominant.rootChroma - 7 + 12) % 12 !== nextChroma) return null // must resolve down a fifth
  if (nextChroma === key.rootChroma) return null // resolving to the tonic is just V

  const targetTriad = next.tonic + (next.intervals.includes("3m") ? "m" : "")
  const target = romanNumeral(targetTriad, key)
  if (!target) return null

  return `V${dominant.seventh}/${target}`
}

