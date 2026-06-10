import { initialize, type ActivationContext } from "@ableton-extensions/sdk"
import { extractHarmonyTrack } from "./command.js"

const COMMAND_ID = "harmony-track.extract"

// distinct titles per scope — when right-clicking a selected clip, Live shows
// the matching clip-scope AND selection-scope actions side by side
const ACTIONS = [
  { scope: "MidiClip", title: "Extract Harmony Track (Clip)" },
  { scope: "ClipSlotSelection", title: "Extract Harmony Track (Selection)" },
  { scope: "MidiTrack.ArrangementSelection", title: "Extract Harmony Track (Selection)" },
] as const

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0")

  context.commands.registerCommand(COMMAND_ID, async (arg: unknown) => {
    try {
      await extractHarmonyTrack(context, arg)
    } catch (err) {
      console.error("[HarmonyTrack]", err)
    }
  })

  for (const { scope, title } of ACTIONS) {
    context.ui
      .registerContextMenuAction(scope, title, COMMAND_ID)
      .catch(err => console.error(`[HarmonyTrack] failed to register ${scope} action:`, err))
  }
}
