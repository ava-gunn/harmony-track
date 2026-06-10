# Ableton Extensions SDK — Getting Started

## Prerequisites

1. Join the Ableton Beta Program: https://www.ableton.com/beta/
2. Install **Live 12 Suite beta 12.4.5+** (download via Centercode)
3. Install **Node.js ≥ 22.11.0** (24 LTS recommended)
4. Download the **Extensions SDK zip** from Centercode (linked at https://ableton.github.io/extensions-sdk/). It contains the `@ableton-extensions/sdk` and `@ableton-extensions/cli` package tarballs, the `@ableton-extensions/create-extension` scaffolder, and the full docs. None of these are on npm.

## Scaffolding

Use the project creator from the distribution zip (`@ableton-extensions/create-extension`). The full Quick Start flow is in the bundled docs (Centercode login required — not mirrored publicly).

## Project structure

A real working layout (from open-source community extensions built with the official scaffold):

```
my-extension/
  manifest.json          # extension metadata, points at the bundled entry file
  package.json
  tsconfig.json
  build.ts               # esbuild bundling script
  src/
    extension.ts         # exports activate(activation)
    dialog.html          # optional WebView dialog UI
    html.d.ts            # declare module "*.html" for importing HTML as text
  vendor/
    ableton-extensions-sdk-1.0.0-beta.0.tgz
    ableton-extensions-cli-1.0.0-beta.0.tgz
  dist/extension.js      # build output (the manifest entry)
```

## manifest.json

Real example:

```json
{
  "name": "Duplicate Track",
  "author": "Federico Pepe",
  "entry": "dist/extension.js",
  "version": "0.0.7",
  "minimumApiVersion": "1.0.0"
}
```

- `entry` — path to the bundled JS file Live's Extension Host loads
- `minimumApiVersion` — lowest Extensions API version the extension needs (currently only `"1.0.0"` exists)

## package.json

```json
{
  "name": "duplicate-track",
  "private": true,
  "version": "0.0.7",
  "type": "module",
  "main": "dist/extension.js",
  "engines": { "node": ">=22.11.0" },
  "scripts": {
    "build": "tsc --noEmit && tsx build.ts --production",
    "build:dev": "tsc --noEmit && tsx build.ts",
    "start": "npm run build:dev && extensions-cli run",
    "package": "npm run build && extensions-cli package"
  },
  "dependencies": {
    "@ableton-extensions/sdk": "file:./vendor/ableton-extensions-sdk-1.0.0-beta.0.tgz"
  },
  "devDependencies": {
    "@ableton-extensions/cli": "file:./vendor/ableton-extensions-cli-1.0.0-beta.0.tgz",
    "esbuild": "0.28.0",
    "tsx": "^4.19.0",
    "typescript": "^5.9.3"
  }
}
```

## Build (build.ts)

The entry must be **bundled** (deps included) since the Extension Host loads a single file. Real build script:

```ts
import * as esbuild from "esbuild";
import * as fs from "node:fs";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const production = process.argv.includes("--production");

await esbuild.build({
  entryPoints: ["src/extension.ts"],
  outfile: manifest.entry,
  bundle: true,
  format: "cjs",
  platform: "node",
  sourcesContent: false,
  logLevel: "info",
  minify: production,
  sourcemap: !production,
});
```

## CLI (from the official `@ableton-extensions/cli` README)

```
extensions-cli run [dir]        Run the extension in Live's Extension Host
                                  --live <path>          override EXTENSION_HOST_PATH
                                  --storage-directory <path>
                                  --temp-directory <path>
                                  --inspect              attach VS Code debugger

extensions-cli package [dir]    Build a .ablx archive
                                  -o, --output <path>
                                  -i, --include <p...>
```

`run` reads `EXTENSION_HOST_PATH` from the environment or a `.env` file in the extension directory; the path points at the `ExtensionHostNodeModule.node` file shipped with the Live 12.4.5 beta install (exact location per OS is documented in the bundled SDK docs).

## Dev loop

1. Open the Live 12.4.5 beta with a Set
2. `npm start` — type-checks, bundles dev build, runs the extension live in the Extension Host (`extensions-cli run`)
3. Use `--inspect` to attach the VS Code debugger
4. Use `-i/--include` with `package` to add extra runtime assets (HTML UIs, audio files, binaries) to the `.ablx`

## Minimal extension

```ts
import * as ableton from "@ableton-extensions/sdk";

export function activate(activation: ableton.ActivationContext) {
  const context = ableton.initialize(activation, "1.0.0");

  context.commands.registerCommand("my-ext.do-thing", async (arg: unknown) => {
    const track = context.getObjectFromHandle(arg as ableton.Handle, ableton.Track);
    track.name = "Renamed by extension";
  });

  context.ui.registerContextMenuAction("MidiTrack", "Do Thing", "my-ext.do-thing");
}
```

The module must export `activate(activation: ActivationContext)`; call `initialize(activation, "1.0.0")` to get the `ExtensionContext`.

## Install / distribute

- `npm run package` produces `Name-x.y.z.ablx`
- Users install via Live's **Settings → Extensions**, then trigger the extension from right-click context menus on the relevant object (track, clip, scene, clip slot, Simpler, Drum Rack, sample…)
