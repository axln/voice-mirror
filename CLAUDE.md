# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Voice Mirror — a single-page app that records audio from the microphone and plays it back instantly. Svelte 5 (runes) + TypeScript + Vite + Tailwind CSS v4.

## Commands

```bash
yarn dev      # start Vite dev server
yarn build    # production build (outputs to dist/)
yarn preview  # preview the production build
yarn check    # type-check: svelte-check + tsc (no separate lint/test scripts exist)
```

There is no test suite and no lint script configured. Use `yarn check` to verify changes compile and type-check.

Formatting is via Prettier (`.prettierrc`): single quotes, trailing commas (es5), 100 print width, with `prettier-plugin-svelte` and `prettier-plugin-tailwindcss` (which auto-sorts Tailwind classes). There's no `format` script — run `yarn prettier --write .` (or via `npx`) directly if needed.

## Architecture

- Path alias `~` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).
- `src/App.svelte` — root component, just mounts `Recorder`.
- `src/components/Recorder.svelte` — the app's entire state machine. Owns `recording`/`playing`/`audio`/`audioUrl` state via runes, wires up the record and play/pause buttons, global spacebar/enter/escape keyboard shortcuts (`svelte:window` with `onkeydowncapture`), and derives the status text shown to the user. This is the file to read first to understand app behavior.
- `src/lib/media.ts` — `startAudioRecord()` wraps `MediaRecorder`/`getUserMedia` (mono, AGC/echo-cancellation/noise-suppression all explicitly disabled to capture raw input) and resolves to a `stopRecord()` closure that returns a `Promise<Blob>` of the recording.
- `src/components/Surfer.svelte` — thin wrapper around `wavesurfer.js` for waveform display + playback of a recorded `audioUrl`; exposes the underlying `<audio>` element via `bind:audioElement` so `Recorder` can drive play/pause directly. Recorded audio is looped (`ws.getMediaElement().loop = true`).
- `src/components/Sandbox.svelte` — a separate wavesurfer.js experiment using `RecordPlugin` for live waveform-during-recording. Not wired into `App.svelte`; kept as a reference/scratch component, not part of the main flow.
- `src/components/Button.svelte` — shared button primitive; merges classes with `tailwind-merge`/`clsx`, forwards all extra props, exposes its DOM element via `bind:element`.
- `src/lib/timer.ts` — trivial `delay(ms)` promise helper.

## Notes specific to this codebase

- Audio state flows one-directionally: `Recorder` owns the `Blob`/object-URL lifecycle (creating and revoking `URL.createObjectURL` in an `$effect` cleanup) and passes `audioUrl` down to `Surfer`, which owns the wavesurfer instance and hands the `<audio>` element back up via a bindable prop.
- `stopRecord` can only be called once (`startAudioRecord` throws on a second call) — `Recorder` nulls it out immediately after invoking it.
- Recording start is async (`getUserMedia` + `MediaRecorder` setup); `Recorder` guards against the stop button being pressed before `stopRecord` is available (`disabled={recording && !stopRecord}`).
