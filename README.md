# Voice Mirror

[![Deploy to GitHub Pages](https://github.com/axln/voice-mirror/actions/workflows/deploy.yml/badge.svg)](https://github.com/axln/voice-mirror/actions/workflows/deploy.yml)

A single-page app that records audio from your microphone and plays it back instantly — a "mirror" for your own voice. Useful for hearing yourself in real time when practicing speech, singing, or accent training.

**Live app:** https://axln.github.io/voice-mirror/

## Features

- One-tap record, with instant playback of the take
- Looping playback so you can listen to a recording repeatedly
- Waveform visualization of the recording ([wavesurfer.js](https://wavesurfer.xyz/))
- Keyboard shortcuts: <kbd>Space</kbd> / <kbd>Enter</kbd> to record or play, <kbd>Esc</kbd> to stop
- Raw microphone capture — echo cancellation, noise suppression, and automatic gain control are all disabled so you hear exactly what the mic picks up

## Tech stack

- [Svelte 5](https://svelte.dev/) (runes) + TypeScript
- [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)

## Getting started

Requires Node.js 24 (LTS) and Yarn.

```bash
yarn install    # install dependencies
yarn dev        # start the dev server
yarn build      # production build (outputs to dist/)
yarn preview    # preview the production build
yarn run check  # type-check (svelte-check + tsc)
```

There's no test suite or lint script configured for this project.

## Browser requirements

Recording uses the [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) and [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) APIs, which require:

- A modern browser (recent Chrome, Firefox, Safari, or Edge)
- A secure context (HTTPS, or `localhost` during development)
- Microphone permission granted when prompted

## Deployment

Pushes to `main` automatically build and deploy the app to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
