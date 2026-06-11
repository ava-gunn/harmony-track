import { GridQuantization, type Song } from "@ableton-extensions/sdk"
import { DETECTION_GRIDS } from "../core/settings.js"

const GRID_BEATS: Partial<Record<GridQuantization, number>> = {
  [GridQuantization.EightBars]: 32,
  [GridQuantization.FourBars]: 16,
  [GridQuantization.TwoBars]: 8,
  [GridQuantization.Bar]: 4,
  [GridQuantization.Half]: 2,
  [GridQuantization.Quarter]: 1,
  [GridQuantization.Eighth]: 0.5,
  [GridQuantization.Sixteenth]: 0.25,
  [GridQuantization.ThirtySecond]: 0.125,
}

// Live's grid setting → the nearest supported detection grid; NoGrid → 1 beat
export function liveGridBeats(song: Song<"1.0.0">): number {
  const raw = GRID_BEATS[song.gridQuantization]
  if (raw == null) return 1
  const beats = song.gridIsTriplet ? raw * (2 / 3) : raw
  return DETECTION_GRIDS.reduce<number>(
    (best, g) => (Math.abs(g - beats) < Math.abs(best - beats) ? g : best),
    1
  )
}
