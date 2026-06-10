# Ableton Extensions SDK — API Reference (1.0.0-beta.0)

Condensed from the actual type definitions in `@ableton-extensions/sdk` (`dist/index.d.mts`). All names and signatures below are real. Only one API version exists: `"1.0.0"`. Generic `<Version>` parameters omitted for brevity.

## Entry point

```ts
export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0")
}
```

```ts
declare const initialize: <V extends ApiVersion>(
  context: ActivationContext, apiVersion: V) => ExtensionContext<V>;

interface ActivationContext {
  hostApiVersion: string;  // latest API version the Extension Host supports
}
```

Pass the lowest API version your extension needs — the host preserves old API versions, so a lower target stays compatible with more Live releases. `initialize` throws if the host doesn't support the requested version.

## ExtensionContext

```ts
interface ExtensionContext {
  application: Application;
  commands: Commands;
  environment: Environment;
  resources: Resources;
  ui: Ui;
  getObjectFromHandle<T extends DataModelObject>(handle: Handle, type: ...): T;
  withinTransaction<T>(fn: () => T): T;
}
```

- `getObjectFromHandle(handle, Type)` resolves an opaque `Handle` (`{ id: bigint }`, only ever received from the host) into a typed SDK object. Objects are cached by handle id. Pass `DataModelObject` when the type is unknown, then branch with `instanceof`. Throws if the object was deleted or the type mismatches.
- `withinTransaction(fn)` groups mutations into **one undo step**. `fn` must be synchronous, but returning `Promise.all([...])` groups async creations:

```ts
const tracks = await withinTransaction(() =>
  Promise.all([song.createAudioTrack(), song.createAudioTrack()]),
);
```

## Object model

Hierarchy: `Application → Song → tracks/scenes/cuePoints → clipSlots/takeLanes/clips/devices → ...`. Every object extends `DataModelObject` (`.handle`, `.parent`). Each class has a static `className` (e.g. `"AudioClip"`, `"ClipSlot"`).

Reads are synchronous getters; structural mutations return Promises (await to ensure completion). Setters are plain property assignment.

### Application
- `song: Song`

### Song (the current Live Set)
- `tracks: Track[]` (regular tracks only), `returnTracks: Track[]`, `mainTrack: Track`
- `scenes: Scene[]`, `cuePoints: CuePoint[]`
- `tempo: number` (rw)
- `gridQuantization: GridQuantization`, `gridIsTriplet: boolean`
- `rootNote: number` (0=C..11=B), `scaleName: string`, `scaleMode: boolean`, `scaleIntervals: number[]`
- `createAudioTrack(): Promise<AudioTrack>`, `createMidiTrack(): Promise<MidiTrack>` (inserted after last selected track)
- `createScene(index: number): Promise<Scene>` (`-1` appends)
- `deleteTrack(track)`, `deleteScene(scene)`, `duplicateTrack(track)`, `duplicateScene(scene)`
- `createCuePoint(time: number): Promise<CuePoint>`, `deleteCuePoint(cuePoint)`

### Track (base; subclasses AudioTrack, MidiTrack)
- `name` (rw), `mute` (rw), `solo` (rw), `arm` (rw), `mutedViaSolo` (ro)
- `clipSlots: ClipSlot[]`, `takeLanes: TakeLane[]`, `arrangementClips: Clip[]`
- `groupTrack: Track | null`, `devices: Device[]`, `mixer: TrackMixer`
- `createTakeLane(): Promise<TakeLane>`
- `insertDevice(deviceName: string, index: number): Promise<Device>` — **built-in Live devices only** (e.g. `"Reverb"`, `"Auto Filter"`); no third-party plug-ins
- `deleteDevice(device)`, `duplicateDevice(device)`
- `deleteClip(clip)` (arrangement clips; session clips via `ClipSlot.deleteClip`)
- `clearClipsInRange(startTime, endTime)` — overlapping clips are truncated, not deleted
- `MidiTrack.createMidiClip(startTime, duration): Promise<MidiClip>` (beats)
- `AudioTrack.createAudioClip(args): Promise<AudioClip>`:

```ts
createAudioClip(args: {
  filePath: string;       // absolute path
  startTime: number;      // arrangement position in beats
  duration?: number;      // beats; defaults to natural sample length at current tempo
  isWarped?: boolean;     // required when loopSettings given
  loopSettings?: ClipLoopSettings;
}): Promise<AudioClip>
```

### ClipSlot (Session View)
- `clip: Clip | null`
- `deleteClip(): Promise<void>`
- `createMidiClip(length: number): Promise<MidiClip>`
- `createAudioClip({ filePath, isWarped?, loopSettings? }): Promise<AudioClip>`

### TakeLane
- `clips: Clip[]`, `name` (rw)
- `createMidiClip(startTime, duration)`, `createAudioClip({ filePath, startTime, duration?, isWarped?, loopSettings? })`

### Clip (base; subclasses AudioClip, MidiClip)
- `name` (rw), `color` (rw, number), `muted` (rw)
- `startTime`, `endTime`, `duration`, `startMarker`, `endMarker` (ro, beats)
- `looping` (rw — enabling on an unwarped audio clip auto-enables warping), `loopStart`, `loopEnd` (ro)

### MidiClip
- `notes: NoteDescription[]` (rw — set replaces all notes)

```ts
type NoteDescription = {
  pitch: number;
  startTime: number;
  duration: number;
  velocity?: number;
  muted?: boolean;
  probability?: number;
  velocityDeviation?: number;
  releaseVelocity?: number;
  selected?: boolean;
};
```

### AudioClip
- `filePath: string` (ro), `warping` (rw), `warpMode: WarpMode` (rw), `warpMarkers: WarpMarker[]` (ro)
- `WarpMode`: `Beats=0, Tones=1, Texture=2, Repitch=3, Complex=4, ComplexPro=6`
- `WarpMarker`: `{ sampleTime: number, beatTime: number }`

### ClipLoopSettings

```ts
interface ClipLoopSettings {
  looping: boolean;
  startMarker: number;  // beats
  endMarker: number;
  loopStart: number;
  loopEnd: number;
}
```
Enforced: `startMarker ≤ endMarker`; loop ≥ 0.25 beats; if `!looping` then `loopStart === startMarker && loopEnd === endMarker`; if `!isWarped` positions non-negative and `looping` must be false.

### Scene
- `name` (rw), `tempo` (ro), `signatureNumerator` (ro), `signatureDenominator` (ro)

### CuePoint
- `time` (ro), `name` (rw)

### Device / racks
- `Device`: `name: string` (ro), `parameters: DeviceParameter[]`
- `RackDevice extends Device`: `chains: Chain[]`, `insertChain(index): Promise<Chain>`
- `DrumRack extends RackDevice` (`className: "DrumRackDevice"`): `chains: DrumChain[]`
- `Chain`: `devices: Device[]`, `mixer: ChainMixer`, `insertDevice(name, index)`, `deleteDevice`, `duplicateDevice`
- `DrumChain extends Chain`: `receivingNote: number` (rw)
- `Simpler extends Device`: `sample: Sample | null`, `replaceSample(filePath): Promise<Sample>`
- `Sample`: `filePath: string` (ro)

### DeviceParameter
- `name`, `min`, `max`, `isQuantized`, `defaultValue` (ro)
- `valueItems: { name, shortName }[]` (for quantized/choice params)
- `getValue(): Promise<number>`, `setValue(value): Promise<void>`

### Mixers
- `TrackMixer` (`className: "MixerDevice"`) and `ChainMixer` (`"ChainMixerDevice"`): `volume: DeviceParameter`, `panning: DeviceParameter`, `sends: DeviceParameter[]`

## Commands

```ts
commands.registerCommand(commandId: string, callback: (...args: unknown[]) => void): void
commands.executeCommand(commandId: string, ...args: unknown[]): void
```

Commands are invoked by Live (context menu actions) or programmatically. Context-menu invocations pass either a `Handle` or a selection object as first arg.

## Ui

```ts
ui.registerContextMenuAction(scope: ContextMenuScope, title: string,
  commandId: string): Promise<() => Promise<void>>   // resolves to an unregister fn
```

Scopes passing the object's `Handle` as first command arg:
`"AudioClip" | "AudioTrack" | "ClipSlot" | "DrumRack" | "MidiClip" | "MidiTrack" | "Sample" | "Scene" | "Simpler"`

Scopes passing a selection object:
- `"ClipSlotSelection"` → `{ selected_clip_slots: Handle[] }`
- `"AudioTrack.ArrangementSelection"` / `"MidiTrack.ArrangementSelection"` → `{ time_selection_start: number, time_selection_end: number, selected_lanes: Handle[] }`

```ts
ui.showModalDialog(url: string, width: number, height: number): Promise<string>
```
Opens a WebView modal. URL schemes: `file:`, `data:`, `https:`, `http://localhost`. The dialog returns a result by posting `{ method: "close_and_send", params: [resultString] }` to the host message handler — `window.webkit.messageHandlers.live.postMessage` (macOS) or `window.chrome.webview.postMessage` (Windows). Cross-platform helper used in real dialogs:

```js
function closeWithResult(result) {
  const msg = { method: "close_and_send", params: [JSON.stringify(result)] };
  if (window.webkit?.messageHandlers?.live) {
    window.webkit.messageHandlers.live.postMessage(msg);
  } else if (window.chrome?.webview) {
    window.chrome.webview.postMessage(msg);
  }
}
```

```ts
ui.withinProgressDialog(text: string, options: { progress?: number },
  callback: (update: (text: string, progress?: number) => Promise<void>,
             abortSignal: AbortSignal) => Promise<unknown>): Promise<unknown>
```
Official doc example:

```ts
const wavPath = await ui.withinProgressDialog(
  "Rendering audio…",
  { progress: 0 },
  async (update, signal) => {
    await update("Analysing…", 30);
    if (signal.aborted) return;
    await update("Rendering…", 70);
    return await resources.renderPreFxAudio(track, startBeat, endBeat);
  },
);
```

## Resources

```ts
resources.renderPreFxAudio(track: AudioTrack, startTime: number, endTime: number): Promise<string>
// renders pre-FX arrangement audio between beat positions; returns path to a WAV in the temp dir

resources.importIntoProject(filePath: string): Promise<string>
// copies a file into the Live project folder; use the returned path afterwards
```

## Environment

- `environment.storageDirectory: string | undefined` — per-extension persistent storage (config, credentials, cache)
- `environment.tempDirectory: string | undefined` — per-extension temp files, may be cleaned between sessions
- `environment.language: string | undefined` — Live's UI language, uppercase ISO 639-1 (`"EN"`, `"DE"`, `"JA"`)

## Complete real example (Duplicate Track extension)

```ts
import * as ableton from "@ableton-extensions/sdk";

const COMMAND_ID = "duplicate-track.duplicate-and-clear";

export function activate(activation: ableton.ActivationContext) {
  const context = ableton.initialize(activation, "1.0.0");

  context.ui.registerContextMenuAction("AudioTrack", "Duplicate (No clips)", COMMAND_ID);
  context.ui.registerContextMenuAction("MidiTrack", "Duplicate (No clips)", COMMAND_ID);

  context.commands.registerCommand(COMMAND_ID, async (arg: unknown) => {
    const track = context.getObjectFromHandle(arg as ableton.Handle, ableton.Track);
    const song = context.application.song;

    const duplicate = await song.duplicateTrack(track);

    await context.withinTransaction(() =>
      Promise.all([
        ...duplicate.arrangementClips.map((clip) => duplicate.deleteClip(clip)),
        ...duplicate.clipSlots
          .filter((slot) => slot.clip !== null)
          .map((slot) => slot.deleteClip()),
      ]),
    );
  });
}
```

## Notable gaps in API 1.0.0

- No event/observer/subscription API — state is polled by getters at invocation time
- No transport control (play/stop/record), no playback position
- No automation envelope read/write (despite marketing copy mentioning automation)
- No track/scene selection API beyond what context-menu scopes pass in
- No groove pool, browser, or preferences access
- `insertDevice` cannot load third-party plug-ins
