import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const target = args.find(a => !a.startsWith("-"))

if (!target || !/^(patch|minor|major|\d+\.\d+\.\d+)$/.test(target)) {
  console.log("Usage: npm run release -- <patch|minor|major|x.y.z> [--dry-run]")
  process.exit(1)
}

const run = (cmd, cmdArgs) => {
  console.log(`${dryRun ? "[dry-run] " : ""}$ ${cmd} ${cmdArgs.join(" ")}`)
  if (!dryRun) execFileSync(cmd, cmdArgs, { cwd: root, stdio: "inherit" })
}

const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: root }).toString().trim()
if (dirty) {
  console.error("Working tree not clean — commit or stash first")
  process.exit(1)
}

run("npm", ["version", target, "--no-git-tag-version"])
run("node", ["scripts/sync-version.mjs"])

// verify before tagging; the .ablx itself is built and attached by CI on tag push
run("npm", ["test"])
run("npm", ["run", "build"])

const version = dryRun
  ? `<${target}>`
  : JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version
const tag = `v${version}`

run("git", ["add", "package.json", "package-lock.json", "manifest.json"])
run("git", ["commit", "-m", `release: ${tag}`])
run("git", ["tag", tag])
run("git", ["push", "--follow-tags", "origin", "HEAD"])

console.log(dryRun ? `Dry run complete — would tag ${tag}` : `Released ${tag} — CI will attach the .ablx to the GitHub release`)
