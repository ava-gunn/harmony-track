import type { SimpleNote } from "./types.js"

export function quantizeNotes(notes: SimpleNote[], grid = 1): SimpleNote[] {
  const snapped = notes
    .map(({ pitch, startTime, duration }) => {
      const start = Math.round(startTime / grid) * grid
      const end = Math.round((startTime + duration) / grid) * grid
      return { pitch, startTime: start, duration: end - start }
    })
    .filter(n => n.duration > 0)
    .sort((a, b) => a.pitch - b.pitch || a.startTime - b.startTime)

  const merged: SimpleNote[] = []
  for (const note of snapped) {
    const prev = merged[merged.length - 1]
    if (prev && prev.pitch === note.pitch && note.startTime <= prev.startTime + prev.duration) {
      prev.duration = Math.max(prev.startTime + prev.duration, note.startTime + note.duration) - prev.startTime
    } else {
      merged.push(note)
    }
  }
  return merged.sort((a, b) => a.startTime - b.startTime || a.pitch - b.pitch)
}
