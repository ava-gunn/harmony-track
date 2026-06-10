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
