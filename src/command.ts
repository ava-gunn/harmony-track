import {
  ClipSlot,
  DataModelObject,
  MidiClip,
  MidiTrack,
  type ArrangementSelection,
  type ClipSlotSelection,
  type ExtensionContext,
  type Handle,
  type Song,
} from "@ableton-extensions/sdk"
import { guideNotes } from "./core/guideNotes.js"
import { activeWindowLength, analyzeNotes, placeClip } from "./core/pipeline.js"
import type { ClipView, KeyContext } from "./core/types.js"
import { locateClip, readClipView } from "./live/clipLocation.js"
import { deleteOverlappingClips, findOrCreateHarmonyTrack } from "./live/harmonyTrack.js"

type V = "1.0.0"

interface Source {
  track: MidiTrack<V>
  anchor: number
  view: ClipView
  targetDuration: number
}

const isClipSlotSelection = (arg: unknown): arg is ClipSlotSelection =>
  typeof arg === "object" && arg !== null && "selected_clip_slots" in arg

const isArrangementSelection = (arg: unknown): arg is ArrangementSelection =>
  typeof arg === "object" && arg !== null && "selected_lanes" in arg

function sourceFromSessionClip(clip: MidiClip<V>, track: MidiTrack<V>): Source {
  const view = readClipView(clip)
  return { track, anchor: 0, view, targetDuration: activeWindowLength(view) }
}

function collectSources(context: ExtensionContext<V>, song: Song<V>, arg: unknown): Source[] {
  if (isClipSlotSelection(arg)) {
    return arg.selected_clip_slots.flatMap(handle => {
      const slot = context.getObjectFromHandle(handle, ClipSlot)
      const clip = slot.clip
      return clip instanceof MidiClip && slot.parent instanceof MidiTrack
        ? [sourceFromSessionClip(clip, slot.parent)]
        : []
    })
  }

  if (isArrangementSelection(arg)) {
    const { time_selection_start: selStart, time_selection_end: selEnd } = arg
    return arg.selected_lanes.flatMap(handle => {
      const lane = context.getObjectFromHandle(handle, DataModelObject)
      if (!(lane instanceof MidiTrack)) return []
      return lane.arrangementClips
        .filter(c => c instanceof MidiClip && c.startTime < selEnd && c.endTime > selStart)
        .map(c => ({
          track: lane,
          anchor: c.startTime,
          view: readClipView(c as MidiClip<V>),
          targetDuration: c.duration,
        }))
    })
  }

  const clip = context.getObjectFromHandle(arg as Handle, MidiClip)
  const location = locateClip(song, clip)
  if (!location) return []
  if (location.kind === "session") return [sourceFromSessionClip(clip, location.track)]
  return [
    { track: location.track, anchor: clip.startTime, view: readClipView(clip), targetDuration: clip.duration },
  ]
}

export async function extractHarmonyTrack(context: ExtensionContext<V>, arg: unknown): Promise<void> {
  const song = context.application.song
  const sources = collectSources(context, song, arg).filter(s => s.targetDuration > 0)
  if (sources.length === 0) {
    console.error("[HarmonyTrack] no MIDI clips in selection")
    return
  }

  const key: KeyContext | null = song.scaleMode
    ? { rootChroma: song.rootNote, scaleName: song.scaleName, scaleIntervals: song.scaleIntervals }
    : null

  await context.ui.withinProgressDialog("Extracting harmony…", { progress: 0 }, async (update, signal) => {
    await update("Analyzing chords…", 10)
    const notes = sources.flatMap(s => placeClip(s.view, s.anchor, s.targetDuration))
    const startBeat = Math.floor(Math.min(...sources.map(s => s.anchor)))
    const endBeat = Math.ceil(Math.max(...sources.map(s => s.anchor + s.targetDuration)))
    const regions = analyzeNotes(notes, startBeat, endBeat, key)
    if (regions.length === 0) {
      await update("No chords detected", 100)
      return
    }

    await update(`Writing ${regions.length} chord clips…`, 30)
    const trackIndex = (t: Source["track"]) => song.tracks.findIndex(x => x.handle.id === t.handle.id)
    const topmostTrack = sources.reduce((top, s) => (trackIndex(s.track) < trackIndex(top.track) ? s : top)).track

    await context.withinTransaction(() =>
      (async () => {
        const track = await findOrCreateHarmonyTrack(song, topmostTrack)
        for (const s of sources) {
          await deleteOverlappingClips(track, Math.floor(s.anchor), Math.ceil(s.anchor + s.targetDuration))
        }
        for (const region of regions) {
          if (signal.aborted) return
          const length = region.endBeat - region.startBeat
          const guideClip = await track.createMidiClip(region.startBeat, length)
          guideClip.name = region.numeral ? `${region.chord} / ${region.numeral}` : region.chord
          if (region.color != null) guideClip.color = region.color
          guideClip.notes = guideNotes(region.chord, length)
        }
      })()
    )
    await update("Done", 100)
  })
}
