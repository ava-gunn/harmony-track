import { initialize, type ActivationContext } from "@ableton-extensions/sdk"
import { addChordLocators, extractHarmonyTrack } from "./command.js"
import { loadSettings, saveSettings } from "./live/settingsStore.js"
import { showSettingsDialog } from "./settingsDialog.js"

const EXTRACT_ID = "harmony-track.extract"
const LOCATORS_ID = "harmony-track.locators"
const SETTINGS_ID = "harmony-track.settings"

// every context-menu scope the SDK offers — settings should be reachable
// from any right-click since it acts on nothing in particular
const ALL_SCOPES = [
  "AudioClip",
  "AudioTrack",
  "ClipSlot",
  "DrumRack",
  "MidiClip",
  "MidiTrack",
  "Sample",
  "Scene",
  "Simpler",
  "ClipSlotSelection",
  "AudioTrack.ArrangementSelection",
  "MidiTrack.ArrangementSelection",
] as const

// distinct titles per scope — when right-clicking a selected clip, Live shows
// the matching clip-scope AND selection-scope actions side by side
const ACTIONS = [
  { scope: "MidiClip", title: "Extract Harmony Track (Clip)", commandId: EXTRACT_ID },
  { scope: "ClipSlotSelection", title: "Extract Harmony Track (Selection)", commandId: EXTRACT_ID },
  { scope: "MidiTrack.ArrangementSelection", title: "Extract Harmony Track (Selection)", commandId: EXTRACT_ID },
  { scope: "MidiClip", title: "Add Chord Locators (Clip)", commandId: LOCATORS_ID },
  { scope: "MidiTrack.ArrangementSelection", title: "Add Chord Locators (Selection)", commandId: LOCATORS_ID },
  ...ALL_SCOPES.map(scope => ({ scope, title: "Harmony Track Settings…", commandId: SETTINGS_ID }) as const),
] as const

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0")

  context.commands.registerCommand(EXTRACT_ID, async (arg: unknown) => {
    try {
      await extractHarmonyTrack(context, arg)
    } catch (err) {
      console.error("[HarmonyTrack]", err)
    }
  })

  context.commands.registerCommand(LOCATORS_ID, async (arg: unknown) => {
    try {
      await addChordLocators(context, arg)
    } catch (err) {
      console.error("[HarmonyTrack]", err)
    }
  })

  context.commands.registerCommand(SETTINGS_ID, async () => {
    try {
      const next = await showSettingsDialog(context, loadSettings(context.environment))
      if (next) saveSettings(context.environment, next)
    } catch (err) {
      console.error("[HarmonyTrack]", err)
    }
  })

  for (const { scope, title, commandId } of ACTIONS) {
    context.ui
      .registerContextMenuAction(scope, title, commandId)
      .catch(err => console.error(`[HarmonyTrack] failed to register ${scope} action:`, err))
  }
}
