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

// selection scopes only — right-clicking a clip selects it first, so the
// selection actions cover single clips too without duplicate menu entries
const ACTIONS = [
  { scope: "ClipSlotSelection", title: "Extract Harmony Track", commandId: EXTRACT_ID },
  { scope: "MidiTrack.ArrangementSelection", title: "Extract Harmony Track", commandId: EXTRACT_ID },
  { scope: "MidiTrack.ArrangementSelection", title: "Add Chord Locators", commandId: LOCATORS_ID },
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
