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

There's also `yarn bump-version` (`scripts/bump-version.mjs`), which increments `package.json`'s patch version. It's a CI-only step (see `.github/workflows/deploy.yml`): the deploy workflow bumps the version before building — so the build embeds the new version via `__APP_VERSION__` — then commits it back to `main` with `[skip ci]`. No need to run it locally.

After `git push` to `main`, wait for the "Deploy to GitHub Pages" GitHub Actions workflow to finish, then run `git pull --rebase` — the workflow pushes a version-bump commit back to `main`, and skipping this leaves the local branch behind origin.

Formatting is via Prettier (`.prettierrc`): single quotes, trailing commas (es5), 100 print width, with `prettier-plugin-svelte` and `prettier-plugin-tailwindcss` (which auto-sorts Tailwind classes). There's no `format` script — run `yarn prettier --write .` (or via `npx`) directly if needed.

## Architecture

- Path alias `~` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).
- `vite.config.ts` also defines the global `__APP_VERSION__` from `package.json`'s `version` field; `Recorder.svelte` displays it (`v{__APP_VERSION__}`) below the card.
- `src/App.svelte` — root component, just mounts `Recorder`.
- `src/components/Recorder.svelte` — the app's entire state machine. Owns `recording`/`playing`/`audio`/`audioUrl`/`getNextPeak` state, plus microphone-selection state (`audioInputDevices`/`selectedDeviceId`/`showMicMenu`), via runes; wires up the record, play/pause, and mic-select buttons, and global spacebar/enter/escape keyboard shortcuts (`svelte:window` with `onkeydowncapture`). This is the file to read first to understand app behavior. The mic-select popover lists devices from `listAudioInputDevices()`, refreshing on the browser's `devicechange` event and again once a recording starts (device labels are blank until mic permission is granted); it collapses its own "System default" entry into the browser's synthesized `deviceId: "default"` entry when Chrome/Edge provides one, to avoid listing the default twice.
- `src/lib/media.ts` — `listAudioInputDevices()` returns the `audioinput` entries from `navigator.mediaDevices.enumerateDevices()`. `startAudioRecord(deviceId?)` wraps `MediaRecorder`/`getUserMedia` (mono, AGC/echo-cancellation/noise-suppression all explicitly disabled to capture raw input; `deviceId` selects a specific input when given) and resolves to `{ stopRecord, getNextPeak }`: `stopRecord()` returns a `Promise<Blob>` of the recording, `getNextPeak()` reports the loudest sample since the last call (for the live waveform).
- `src/components/Waveform.svelte` — self-contained waveform component with two modes selected by which prop is passed: `{getNextPeak}` draws a live scrolling canvas waveform while recording; `{audioUrl}` (+ `bind:audioElement`, exposing the `<audio>` element so `Recorder` can drive play/pause directly) decodes the recording, draws a static bar waveform, and overlays a wavesurfer-style playback cursor — a second, identically-drawn canvas in the progress color, revealed up to the current playback position via a CSS `clip-path` that's nudged every animation frame, plus a thin cursor line. Click or arrow keys on it seek. Recorded audio is looped (`<audio loop>`).
- `src/lib/waveform.ts` — `calculatePeaks()` downsamples decoded PCM into display-ready peaks (dB-scaled, squared so quiet audio reads as quieter); `createPeakSampler()` taps an `AnalyserNode` off the live `MediaStream` (not connected to speakers) for the live waveform, and exposes `dispose()` to tear down the `AudioContext`/analyser when recording stops.
- `src/lib/circular-buffer.ts` — fixed-length ring buffer (`CircularBuffer`) backing the live waveform's scrolling peak window.
- `src/components/Button.svelte` — shared button primitive; merges classes with `tailwind-merge`/`clsx`, forwards all extra props, exposes its DOM element via `bind:element`.
- `src/components/icons/` — small self-contained SVG icon components (`Mic`, `Play`, `Pause`, `Stop`, `Settings`, `Check`, `Logo`), each taking a `size` prop.
- `src/lib/timer.ts` — trivial `delay(ms)` promise helper.
- `index.html` — sets the page `<title>`/description and Open Graph/Twitter card meta tags (pointing at `https://axln.github.io/voice-mirror/`).

## Notes specific to this codebase

- Audio state flows one-directionally: `Recorder` owns the `Blob`/object-URL lifecycle (creating and revoking `URL.createObjectURL` in an `$effect` cleanup) and passes `audioUrl` (or, while recording, `getNextPeak`) down to `Waveform`, which owns the canvas rendering and hands the `<audio>` element back up via a bindable prop.
- `stopRecord` can only be called once (`startAudioRecord` throws on a second call) — `Recorder` nulls it out immediately after invoking it. `getNextPeak` is nulled out at the same time, which stops `Waveform`'s live scrolling animation loop.
- Recording start is async (`getUserMedia` + `MediaRecorder` setup); `Recorder` guards against the stop button being pressed before `stopRecord` is available (`disabled={recording && !stopRecord}`).

## Scratch files

Use `tmp/` at the project root for anything temporary — one-off check scripts, build test output, screenshots taken while verifying a UI change, etc. It's gitignored (except a `.gitkeep` placeholder) so nothing written there ends up in commits.
