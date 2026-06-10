import { MidiTrack, type Song } from "@ableton-extensions/sdk"

type V = "1.0.0"

export const HARMONY_TRACK_NAME = "Harmony"

// The SDK has no positional insert or move API; the only way to control track
// position is duplicateTrack, which inserts immediately after the original.
// To land directly above the source we duplicate the track above it and strip
// it — only possible when that neighbor is a MidiTrack. Otherwise (source is
// the first track, or sits below an audio/group track) we duplicate the source
// itself, which lands directly below it.
export async function findOrCreateHarmonyTrack(song: Song<V>, sourceTrack: MidiTrack<V>): Promise<MidiTrack<V>> {
  const existing = song.tracks.find(
    (t): t is MidiTrack<V> => t instanceof MidiTrack && t.name.trim() === HARMONY_TRACK_NAME
  )
  if (existing) {
    existing.mute = true
    return existing
  }

  const tracks = song.tracks
  const sourceIndex = tracks.findIndex(t => t.handle.id === sourceTrack.handle.id)
  const neighbor = sourceIndex > 0 ? tracks[sourceIndex - 1] : null
  const template = neighbor instanceof MidiTrack ? neighbor : sourceTrack

  const copy = await song.duplicateTrack(template)
  if (!(copy instanceof MidiTrack)) {
    await song.deleteTrack(copy)
    throw new Error("duplicated track is not a MIDI track")
  }

  await Promise.all([
    ...copy.arrangementClips.map(c => copy.deleteClip(c)),
    ...copy.clipSlots.filter(s => s.clip !== null).map(s => s.deleteClip()),
  ])
  for (const device of [...copy.devices]) {
    await copy.deleteDevice(device)
  }

  copy.name = HARMONY_TRACK_NAME
  copy.mute = true
  copy.arm = false
  return copy
}

export function deleteOverlappingClips(track: MidiTrack<V>, start: number, end: number): Promise<void[]> {
  return Promise.all(
    track.arrangementClips
      .filter(c => c.startTime < end && c.endTime > start)
      .map(c => track.deleteClip(c))
  )
}
