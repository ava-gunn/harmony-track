import { Chord, Note } from "tonal"
import type { KeyContext } from "./types.js"

// Live's palette spaces ~14 hues ≈ 26° apart; diatonic steps stay just under
// that so the family reads as close-knit cool colors while (usually) snapping
// to distinct swatches. Chromatic pushes stride wider so non-diatonic chords
// leap decisively into the warm zone.
const DEFAULT_TONIC_HUE = 220 // blue
const DEFAULT_DIATONIC_STEP = 24
const CHROMATIC_STEP = 30

export interface ColorOptions {
  tonicHue?: number
  diatonicStep?: number
}

// Key-relative circle-of-fifths color wheel (after Scriabin's clavier à
// lumières, which walks the spectrum around the circle of fifths): the tonic
// is anchored cool blue, diatonic degrees cluster around it — sharp side
// toward green (V, ii, vi, iii, vii°), flat side toward violet (IV; bVII/bIII/
// bVI in minor and the modes). Any out-of-scale chord tone jumps the chord a
// flat 1.5 chromatic steps along its side plus a proportional push, with both
// sides clamping at red — so borrowed and applied chords run visibly hot even
// after Live snaps colors to its palette.
export function chordHue(chordSymbol: string, key: KeyContext, opts: ColorOptions = {}): number | null {
  const tonicHue = opts.tonicHue ?? DEFAULT_TONIC_HUE
  const diatonicStep = opts.diatonicStep ?? DEFAULT_DIATONIC_STEP
  const chord = Chord.get(chordSymbol)
  if (chord.empty || !chord.tonic) return null
  const rootChroma = Note.chroma(chord.tonic)
  if (rootChroma == null) return null

  const chromas = chord.notes.map(n => Note.chroma(n)).filter((c): c is number => c != null)
  if (chromas.length === 0) return null

  const scale = new Set(key.scaleIntervals.map(i => (key.rootChroma + i) % 12))
  const outOfScale = chromas.filter(c => !scale.has(c)).length / chromas.length

  const fifthsPosition = (((rootChroma - key.rootChroma + 12) % 12) * 7) % 12
  const sharpSide = fifthsPosition <= 6
  const baseSteps = sharpSide ? fifthsPosition : 12 - fifthsPosition
  const chromaticPush = outOfScale === 0 ? 0 : 1.5 + outOfScale * 2
  const offset = baseSteps * diatonicStep + chromaticPush * CHROMATIC_STEP

  return sharpSide
    ? Math.max(0, tonicHue - offset)
    : Math.min(360, tonicHue + offset)
}

export function chordColor(chordSymbol: string, key: KeyContext, opts: ColorOptions = {}): number | null {
  const hue = chordHue(chordSymbol, key, opts)
  if (hue == null) return null
  return hslToRgb(hue, 0.65, 0.55)
}

function hslToRgb(hue: number, saturation: number, lightness: number): number {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const h = hue / 60
  const x = chroma * (1 - Math.abs((h % 2) - 1))
  const [r, g, b] =
    h < 1 ? [chroma, x, 0] :
    h < 2 ? [x, chroma, 0] :
    h < 3 ? [0, chroma, x] :
    h < 4 ? [0, x, chroma] :
    h < 5 ? [x, 0, chroma] :
    [chroma, 0, x]
  const m = lightness - chroma / 2
  const channel = (v: number) => Math.round((v + m) * 255)
  return (channel(r) << 16) | (channel(g) << 8) | channel(b)
}
