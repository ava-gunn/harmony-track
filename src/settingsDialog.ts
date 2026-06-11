import type { ExtensionContext } from "@ableton-extensions/sdk"
import { mergeSettings, type Settings } from "./core/settings.js"
import dialogHtml from "./settingsDialog.html"

export async function showSettingsDialog(
  context: ExtensionContext<"1.0.0">,
  current: Settings
): Promise<Settings | null> {
  const html = dialogHtml.replace("/*__SETTINGS__*/null", JSON.stringify(current))

  let resultJson: string
  try {
    resultJson = await context.ui.showModalDialog(`data:text/html,${encodeURIComponent(html)}`, 400, 520)
  } catch {
    return null // window closed without a result
  }

  try {
    const result = JSON.parse(resultJson) as { action?: string; settings?: unknown }
    if (result.action !== "save") return null
    return mergeSettings(result.settings) // never trust dialog JS — re-validate
  } catch {
    return null
  }
}
