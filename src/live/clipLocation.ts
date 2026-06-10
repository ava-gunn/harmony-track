import { MidiTrack, type MidiClip, type Song } from "@ableton-extensions/sdk"
import type { ClipView } from "../core/types.js"

type V = "1.0.0"

export interface ClipLocation {
  kind: "arrangement" | "session"
  track: MidiTrack<V>
  anchorBeat: number
}

export function locateClip(song: Song<V>, clip: MidiClip<V>): ClipLocation | null {
  for (const track of song.tracks) {
    if (!(track instanceof MidiTrack)) continue
    if (track.arrangementClips.some(c => c.handle.id === clip.handle.id)) {
      return { kind: "arrangement", track, anchorBeat: clip.startTime }
    }
    if (track.clipSlots.some(s => s.clip?.handle.id === clip.handle.id)) {
      return { kind: "session", track, anchorBeat: 0 }
    }
  }
  return null
}

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
