import {
  ClipSlot,
  DataModelObject,
  DrumRack,
  MidiClip,
  MidiTrack,
  type ArrangementSelection,
  type ClipSlotSelection,
  type ExtensionContext,
  type Song,
  type Track,
} from "@ableton-extensions/sdk"
import { solidColor } from "./core/chordColor.js"
import { guideNotes } from "./core/guideNotes.js"
import { activeWindowLength, analyzeNotes, placeClip } from "./core/pipeline.js"
import type { Settings } from "./core/settings.js"
import type { ChordRegion, ClipView, KeyContext } from "./core/types.js"
import { readClipView } from "./live/clipLocation.js"
import { liveGridBeats } from "./live/grid.js"
import { deleteOverlappingClips, findOrCreateHarmonyTrack } from "./live/harmonyTrack.js"
import { loadSettings } from "./live/settingsStore.js"

type V = "1.0.0"

interface Source {
  track: MidiTrack<V>
  anchor: number
  view: ClipView
  targetDuration: number
}

// region.scales (best-matching playable scales) is intentionally unused here:
// SDK 1.0 has no writable clip scale or info-text to surface them in Live
function regionLabel(region: ChordRegion): string {
  return region.numeral ? `${region.chord} / ${region.numeral}` : region.chord
}

const isClipSlotSelection = (arg: unknown): arg is ClipSlotSelection =>
  typeof arg === "object" && arg !== null && "selected_clip_slots" in arg

const isArrangementSelection = (arg: unknown): arg is ArrangementSelection =>
  typeof arg === "object" && arg !== null && "selected_lanes" in arg

const isDrumTrack = (track: Track<V>) => track.devices.some(d => d instanceof DrumRack)

function sourceFromSessionClip(clip: MidiClip<V>, track: MidiTrack<V>): Source {
  const view = readClipView(clip)
  return { track, anchor: 0, view, targetDuration: activeWindowLength(view) }
}

function collectSources(context: ExtensionContext<V>, song: Song<V>, arg: unknown): Source[] {
  if (isClipSlotSelection(arg)) {
    return arg.selected_clip_slots.flatMap(handle => {
      const slot = context.getObjectFromHandle(handle, ClipSlot)
      const clip = slot.clip
      return clip instanceof MidiClip && slot.parent instanceof MidiTrack && !isDrumTrack(slot.parent)
        ? [sourceFromSessionClip(clip, slot.parent)]
        : []
    })
  }

  if (isArrangementSelection(arg)) {
    const { time_selection_start: selStart, time_selection_end: selEnd } = arg
    return arg.selected_lanes.flatMap(handle => {
      const lane = context.getObjectFromHandle(handle, DataModelObject)
      if (!(lane instanceof MidiTrack) || isDrumTrack(lane)) return []
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

  console.error("[HarmonyTrack] unexpected command argument shape")
  return []
}

interface Analysis {
  sources: Source[]
  regions: ChordRegion[]
  settings: Settings
}

function analyzeSelection(context: ExtensionContext<V>, arg: unknown): Analysis | null {
  const song = context.application.song
  const sources = collectSources(context, song, arg).filter(s => s.targetDuration > 0)
  if (sources.length === 0) {
    console.error("[HarmonyTrack] no MIDI clips in selection")
    return null
  }

  const settings = loadSettings(context.environment)
  const key: KeyContext | null = song.scaleMode
    ? { rootChroma: song.rootNote, scaleName: song.scaleName, scaleIntervals: song.scaleIntervals }
    : null
  const gridBeats = settings.detectionGrid === "auto" ? liveGridBeats(song) : settings.detectionGrid

  const notes = sources.flatMap(s => placeClip(s.view, s.anchor, s.targetDuration))
  const startBeat = Math.floor(Math.min(...sources.map(s => s.anchor)))
  const endBeat = Math.ceil(Math.max(...sources.map(s => s.anchor + s.targetDuration)))
  const regions = analyzeNotes(notes, startBeat, endBeat, key, {
    gridBeats,
    secondaryDominants: settings.secondaryDominants,
    tonicHue: settings.tonicHue,
    diatonicStep: settings.diatonicStep,
  })

  return { sources, regions, settings }
}

export async function extractHarmonyTrack(context: ExtensionContext<V>, arg: unknown): Promise<void> {
  const song = context.application.song
  const analysis = analyzeSelection(context, arg)
  if (!analysis) return
  const { sources, regions, settings } = analysis

  await context.ui.withinProgressDialog("Extracting harmony…", { progress: 0 }, async (update, signal) => {
    if (regions.length === 0) {
      await update("No chords detected", 100)
      return
    }

    await update(`Writing ${regions.length} chord clips…`, 30)
    const trackIndex = (t: Source["track"]) => song.tracks.findIndex(x => x.handle.id === t.handle.id)
    const topmostTrack = sources.reduce((top, s) => (trackIndex(s.track) < trackIndex(top.track) ? s : top)).track

    await context.withinTransaction(() =>
      (async () => {
        const track = await findOrCreateHarmonyTrack(song, topmostTrack, settings.trackName)
        for (const s of sources) {
          await deleteOverlappingClips(track, Math.floor(s.anchor), Math.ceil(s.anchor + s.targetDuration))
        }
        for (const region of regions) {
          if (signal.aborted) return
          const length = region.endBeat - region.startBeat
          const guideClip = await track.createMidiClip(region.startBeat, length)
          guideClip.name = regionLabel(region)
          if (settings.colorMode === "function" && region.color != null) guideClip.color = region.color
          else if (settings.colorMode === "solid") guideClip.color = solidColor(settings.solidHue)
          guideClip.notes = guideNotes(region.chord, length, {
            low: settings.guideRangeLow,
            high: settings.guideRangeHigh,
          })
        }
      })()
    )
    await update("Done", 100)
  })
}

const CUE_EPS = 1e-3

export async function addChordLocators(context: ExtensionContext<V>, arg: unknown): Promise<void> {
  const song = context.application.song
  const analysis = analyzeSelection(context, arg)
  if (!analysis || analysis.regions.length === 0) {
    console.error("[HarmonyTrack] no chords detected for locators")
    return
  }

  await context.withinTransaction(() =>
    (async () => {
      for (const region of analysis.regions) {
        const label = regionLabel(region)
        const existing = song.cuePoints.find(c => Math.abs(c.time - region.startBeat) < CUE_EPS)
        if (existing) {
          existing.name = label
        } else {
          const cue = await song.createCuePoint(region.startBeat)
          cue.name = label
        }
      }
    })()
  )
}
