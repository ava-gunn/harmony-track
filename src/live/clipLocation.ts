import type { MidiClip } from "@ableton-extensions/sdk"
import type { ClipView } from "../core/types.js"

type V = "1.0.0"

export function readClipView(clip: MidiClip<V>): ClipView {
  return {
    notes: clip.notes
      .filter(n => !n.muted)
      .map(({ pitch, startTime, duration }) => ({ pitch, startTime, duration })),
    startMarker: clip.startMarker,
    endMarker: clip.endMarker,
    looping: clip.looping,
    loopStart: clip.loopStart,
    loopEnd: clip.loopEnd,
  }
}
