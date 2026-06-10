export interface SimpleNote {
  pitch: number
  startTime: number
  duration: number
}

export interface ClipView {
  notes: SimpleNote[]
  startMarker: number
  endMarker: number
  looping: boolean
  loopStart: number
  loopEnd: number
}

export interface KeyContext {
  rootChroma: number
  scaleName: string
  scaleIntervals: number[]
}

export interface DetectedChord {
  symbol: string
  chromas: Set<number>
}

export interface ChordRegion {
  startBeat: number
  endBeat: number
  chord: string
  numeral: string | null
  color: number | null
}
