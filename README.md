# Harmony Track

An Ableton Live extension that builds a silent harmony guide track from any MIDI clip. Like Scale mode shows you the notes in the key, the Harmony track shows you the notes in the *current chord* — layer it with your own clips in the piano roll to see which notes fit the harmony at any moment.

Right-click a MIDI clip containing chords → **Extract Harmony Track (Clip)**. For multi-clip selections — an arrangement time selection across tracks, or selected session clip slots — use **Extract Harmony Track (Selection)**, which appears alongside the single-clip action when a selection exists. Selected clips are analyzed *together* on the shared timeline, so chords on one track and a bassline on another combine into the true harmony (C+E+G over an A bass reads as Am7). The extension:

1. Quantizes the clip's notes to the beat grid
2. Detects the chord on each beat and merges consecutive identical chords into regions
3. If the Set has a scale enabled, derives each chord's harmonic function in that key
4. Writes one arrangement clip per chord onto a muted MIDI track named **Harmony**, created directly above the source track, time-aligned with the source clip — each named `Cmaj / I`, `Am / vi`, `G7 / V7`, … and filled with the chord tones in every octave of the musical range (C1–C6, MIDI 36–96)
5. Colors each clip by the chord root's position on the circle of fifths relative to the key (after Scriabin's circle-of-fifths color wheel, anchored key-relatively): the tonic is blue, the sharp side walks cyan → green → yellow → orange (V, ii, vi, iii, vii°), the flat side walks violet → magenta (IV, bVII, bIII, bVI, bII), and both converge on red at the chromatic tritone. Out-of-scale chord tones push a chord further toward red, so borrowed chords read warmer than diatonic ones on the same root. No scale set → Live's default clip color.

The Harmony track plays no sound: it stays muted and gets no instrument. Re-running the extraction replaces only the harmony clips overlapping the source clip's range, so you can extract different sections from different clips into the same track.

## Requirements

- Ableton Live 12 Suite **beta 12.4.5+** with Extensions enabled (the Extensions SDK is in public beta)
- Node.js ≥ 24.14.1 (pinned to 24.16.0 in `.nvmrc`)

## Setup

```sh
npm install
```

The SDK and CLI aren't on npm; they're vendored as tarballs in `vendor/` (`@ableton-extensions/sdk` and `@ableton-extensions/cli` 1.0.0-beta.0).

## Develop

```sh
npm test        # vitest — core analysis is pure and runs without Live
npm start       # build + run in Live via extensions-cli
npm run package # build + produce the distributable .ablx
```

Then in Live: Settings → Extensions to install/enable, and right-click any MIDI clip.

## Release

```sh
npm run release -- patch     # or minor / major / an explicit x.y.z
```

Bumps `package.json` and `manifest.json` together, runs tests and the build, commits, tags `vX.Y.Z`, and pushes. The release workflow (`.github/workflows/release.yml`) then builds the `.ablx` on CI and attaches it to a GitHub release with generated notes. Add `--dry-run` to preview the steps.

## How detection works

- **Sounding, not struck**: a pitch counts toward a beat if it *overlaps* it, so sustained pads and held notes shape the harmony of every beat they cover.
- **Carry-over**: a beat whose pitches are a subset of the previous chord's tones extends that chord — arpeggios and thinning voicings don't fragment regions.
- **Bass-aware**: detection feeds tonal's `Chord.detect` lowest-note-first, so `{A,C,E,G}` reads as Am7 over A but C6 over C. Candidates with fewer alterations win ties (first-inversion C major is `Cmaj`, not `Em#5`).
- **Numerals**: degree from the Set's root with pop-convention accidentals (`bVII`, `bII`, Lydian `#IV`), quality casing from the chord (`ii7`, `vii°`, `viiø7`, `I+`). No scale set → bare chord names.
- Rests and monophonic passages produce no chord clip — gaps are left uncovered.

## Layout

```
src/core/      pure analysis (tonal only): quantize → detect → merge regions → numerals → guide notes
src/live/      Live object helpers: clip location, Harmony track find-or-create/cleanup
src/command.ts orchestration: progress dialog, single-undo transaction, clip writing
src/extension.ts  registration (context menu + command)
test/          vitest suites for everything under src/core/
```

`docs/ableton-extensions/` holds condensed SDK reference docs and `examples/` contains cloned community extensions used as reference material; neither is part of the build.

## Limitations

- Extensions SDK 1.0.0-beta.0 is run-once with no event/observer, transport, or control-surface APIs — the track can't update live as you edit. Re-run the extraction after changing the source clip.
- Track positioning is constrained: the SDK's only placement primitive is "duplicate inserts after the original". The Harmony track lands directly above the source when the track above it is a MIDI track; if the source is the first track or sits below an audio/group track, it lands directly below instead. An existing Harmony track is reused wherever you've moved it.
- Session-view source clips anchor their harmony clips at arrangement beat 0.
- For looping clips the analysis window is `[startMarker, loopEnd)`, tiled across the clip's arrangement length.
