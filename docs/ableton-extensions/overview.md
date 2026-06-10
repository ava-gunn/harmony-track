# Ableton Extensions SDK — Overview

Official extensions platform for Ableton Live (public beta, announced June 2026). Distinct from Max for Live, MIDI Remote Scripts, and the M4L Live Object Model. Extensions are JavaScript/TypeScript tools that read and edit the **structure of a Live Set** — tracks, clips, notes, devices, parameters — rather than doing audio synthesis/signal processing (that remains M4L's domain).

## Runtime model

- Extensions run in **Node.js**, in a separate "Extension Host" process bridged to Live via a native module (`ExtensionHostNodeModule.node`). Code is not running inside Live's process.
- Execution model is **run-once**: the user triggers a command (typically a right-click context menu action on a track/clip/scene/etc.), the extension performs its task, applies changes, then stops. There is no persistent background loop and **no event/observer API** in API version `1.0.0`.
- UI is limited to native **context menu actions**, **modal dialogs** (a WebView loading `file:`, `data:`, `https:`, or `http://localhost` URLs), and **progress dialogs**.
- Extensions are packaged as `.ablx` archives (zip). Users install them in Live via **Settings → Extensions** and invoke them from context menus.
- All mutations go through Live's undo system; `withinTransaction` groups multiple changes into one undo step.

## Requirements

- **Ableton Live 12 Suite, beta 12.4.5 or later** (public beta only — does not work in earlier versions; not available in Live Standard, Intro, or Lite)
- macOS or Windows
- **Node.js ≥ 22.11.0** (Ableton's docs recommend Node 24 LTS)
- Membership in the Ableton Beta Program (Centercode) to download the SDK

## SDK packages

Distributed as a zip from Centercode (beta login required) — **not published to npm**:

| Package | Purpose |
|---|---|
| `@ableton-extensions/sdk` (1.0.0-beta.0) | Typed access to Live's data model, commands, UI, resources |
| `@ableton-extensions/cli` (1.0.0-beta.0) | `extensions-cli run` (dev loop) and `extensions-cli package` (build `.ablx`) |
| `@ableton-extensions/create-extension` | Project scaffolder |

The zip also contains the official documentation; the public site at ableton.github.io is only a landing page pointing to the download.

## Official URLs

- Docs/SDK landing page: https://ableton.github.io/extensions-sdk/
- Product page (examples, capability overview): https://www.ableton.com/en/live/extensions
- Announcement blog post: https://www.ableton.com/en/blog/introducing-extensions-sdk/
- FAQ: https://help.ableton.com/hc/en-us/articles/27303428331420-Ableton-Extensions-FAQ (blocks automated fetching — open in a browser)
- Beta program signup: https://www.ableton.com/beta/
- SDK + docs download (Centercode, login required): linked from the landing page above
- Community: Ableton Discord (`#extensions`, `#extensions-sdk` channels), https://discord.gg/ableton
- Useful open-source examples (13+ real extensions incl. source, vendored SDK tarballs): https://github.com/federico-pepe/ableton-live-extensions

## Capabilities and limits (API 1.0.0)

Can: read/write track, clip, scene, cue point, device-parameter state; create/delete/duplicate tracks, scenes, clips, devices (built-in Live devices only — no third-party plug-ins); read/write MIDI notes; create audio clips from files; render a track's pre-FX arrangement audio to WAV; import files into the project; read tempo/scale/grid settings; call out to anything Node can (network, filesystem, child processes).

Cannot (in 1.0.0): observe changes/subscribe to events, control the transport (play/stop/record), read or write automation envelopes, load third-party plug-ins, build persistent panel UI inside Live.

Security note from Ableton: extensions are arbitrary Node.js code — they have full filesystem/network access, so only install trusted sources.
