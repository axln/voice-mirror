# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Voice Mirror — a single-page app that records audio from the microphone and plays it back instantly. Svelte 5 (runes) + TypeScript + Vite + Tailwind CSS v4.

## Commands

```bash
yarn dev      # start Vite dev server
yarn build    # production build (outputs to dist/)
yarn preview  # preview the production build
yarn run check # type-check: svelte-check + tsc (no separate lint/test scripts exist)
```

There is no test suite and no lint script configured. Use `yarn run check` to verify changes compile and type-check. Note: plain `yarn check` runs Yarn Classic's own built-in `check` command (lockfile integrity, unrelated) instead of this script — always use `yarn run check`.

Formatting is via Prettier (`.prettierrc`): single quotes, trailing commas (es5), 100 print width, with `prettier-plugin-svelte` and `prettier-plugin-tailwindcss` (which auto-sorts Tailwind classes). There's no `format` script — run `yarn prettier --write .` (or via `npx`) directly if needed.

## Architecture

- Path alias `~` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).
- `src/App.svelte` — root component, just mounts `Recorder`.
- `src/components/Recorder.svelte` — the app's entire state machine. Owns `recording`/`playing`/`audio`/`audioUrl`/`getNextPeak` state via runes, wires up the record and play/pause buttons, and global spacebar/enter/escape keyboard shortcuts (`svelte:window` with `onkeydowncapture`). This is the file to read first to understand app behavior.
- `src/lib/media.ts` — `startAudioRecord()` wraps `MediaRecorder`/`getUserMedia` (mono, AGC/echo-cancellation/noise-suppression all explicitly disabled to capture raw input) and resolves to `{ stopRecord, getNextPeak }`: `stopRecord()` returns a `Promise<Blob>` of the recording, `getNextPeak()` reports the loudest sample since the last call (for the live waveform).
- `src/components/Waveform.svelte` — self-contained waveform component with two modes selected by which prop is passed: `{getNextPeak}` draws a live scrolling canvas waveform while recording; `{audioUrl}` (+ `bind:audioElement`, exposing the `<audio>` element so `Recorder` can drive play/pause directly) decodes the recording, draws a static bar waveform, and overlays a wavesurfer-style playback cursor — a second, identically-drawn canvas in the progress color, revealed up to the current playback position via a CSS `clip-path` that's nudged every animation frame, plus a thin cursor line. Click or arrow keys on it seek. Recorded audio is looped (`<audio loop>`).
- `src/lib/waveform.ts` — `calculatePeaks()` downsamples decoded PCM into display-ready peaks (dB-scaled, squared so quiet audio reads as quieter); `createPeakSampler()` taps an `AnalyserNode` off the live `MediaStream` (not connected to speakers) for the live waveform.
- `src/lib/circular-buffer.ts` — fixed-length ring buffer (`CircularBuffer`) backing the live waveform's scrolling peak window.
- `src/components/Button.svelte` — shared button primitive; merges classes with `tailwind-merge`/`clsx`, forwards all extra props, exposes its DOM element via `bind:element`.
- `src/lib/timer.ts` — trivial `delay(ms)` promise helper.

## Notes specific to this codebase

- Audio state flows one-directionally: `Recorder` owns the `Blob`/object-URL lifecycle (creating and revoking `URL.createObjectURL` in an `$effect` cleanup) and passes `audioUrl` (or, while recording, `getNextPeak`) down to `Waveform`, which owns the canvas rendering and hands the `<audio>` element back up via a bindable prop.
- `stopRecord` can only be called once (`startAudioRecord` throws on a second call) — `Recorder` nulls it out immediately after invoking it. `getNextPeak` is nulled out at the same time, which stops `Waveform`'s live scrolling animation loop.
- Recording start is async (`getUserMedia` + `MediaRecorder` setup); `Recorder` guards against the stop button being pressed before `stopRecord` is available (`disabled={recording && !stopRecord}`).

## Scratch files

Use `tmp/` at the project root for anything temporary — one-off check scripts, build test output, screenshots taken while verifying a UI change, etc. It's gitignored (except a `.gitkeep` placeholder) so nothing written there ends up in commits.
