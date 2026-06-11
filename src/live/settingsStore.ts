import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Environment } from "@ableton-extensions/sdk"
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from "../core/settings.js"

const FILE = "settings.json"

export function loadSettings(env: Environment<"1.0.0">): Settings {
  const dir = env.storageDirectory
  if (!dir) return { ...DEFAULT_SETTINGS }
  try {
    const path = join(dir, FILE)
    if (!existsSync(path)) return { ...DEFAULT_SETTINGS }
    return mergeSettings(JSON.parse(readFileSync(path, "utf8")))
  } catch (err) {
    console.error("[HarmonyTrack] settings load failed, using defaults:", err)
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(env: Environment<"1.0.0">, settings: Settings): void {
  const dir = env.storageDirectory
  if (!dir) {
    console.error("[HarmonyTrack] no storage directory; settings not persisted")
    return
  }
  try {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, FILE), JSON.stringify(settings, null, 2), "utf8")
  } catch (err) {
    console.error("[HarmonyTrack] settings save failed:", err)
  }
}
