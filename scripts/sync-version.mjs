import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
const manifestPath = path.join(root, "manifest.json")
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))

manifest.version = packageJson.version
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Synced manifest.json version to ${packageJson.version}`)
