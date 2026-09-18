<script lang="ts">
  import { CircularBuffer } from '~/lib/circular-buffer';
  import { calculatePeaks } from '~/lib/waveform';

  let {
    getNextPeak = null,
    audioUrl = undefined,
    audioElement = $bindable(),
  }: {
    getNextPeak?: (() => number) | null;
    audioUrl?: string;
    audioElement?: HTMLAudioElement;
  } = $props();

  let containerWidth = $state(0);

  const canvasHeight = 64;
  const barWidth = 2;
  const barGap = 2;
  const barStep = barWidth + barGap;

  // --- live scrolling waveform, shown while recording ---

  // $state (not a plain let) because it's only assigned once the {#if
  // getNextPeak} branch below mounts the canvas — the resize effect must
  // rerun at that point, which a plain bind:this variable wouldn't trigger.
  let liveCanvas: HTMLCanvasElement | undefined = $state();
  let peaksWindow = new CircularBuffer(1);
  const barIntervalMs = 20;
  const speed = 1.1; // pixels per barIntervalMs
  let offset = 0;
  let prevTime = 0;

  $effect(() => {
    if (!liveCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    // Round the backing-store size: leaving it fractional makes the browser
    // truncate it while the CSS size stays exact, so the bitmap ends up
    // stretched by that fraction to fill the box — a subtle but visible blur.
    const targetWidth = Math.round(containerWidth * dpr);
    const targetHeight = Math.round(canvasHeight * dpr);
    if (liveCanvas.width !== targetWidth || liveCanvas.height !== targetHeight) {
      const newLength = Math.ceil(containerWidth / 2 / barStep);
      if (newLength > peaksWindow.length) {
        peaksWindow.length = newLength;
      }
      requestAnimationFrame(() => {
        if (!liveCanvas) return;
        liveCanvas.width = targetWidth;
        liveCanvas.height = targetHeight;
        liveCanvas.style.width = `${containerWidth}px`;
        liveCanvas.style.height = `${canvasHeight}px`;
        drawLive();
      });
    }
  });

  $effect(() => {
    if (getNextPeak) {
      peaksWindow.clear();
      offset = 0;
      prevTime = performance.now();
      animateLive();
    }
  });

  function animateLive() {
    if (!getNextPeak) {
      return;
    }

    const delay = performance.now() - prevTime;
    const dx = (delay / barIntervalMs) * speed;
    offset += dx;
    prevTime = performance.now();

    if (offset > barStep) {
      peaksWindow.push(getNextPeak());
      offset = 0;
    }

    requestAnimationFrame(() => {
      drawLive();
      animateLive();
    });
  }

  function drawLive() {
    if (!liveCanvas) return;
    const ctx = liveCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height);
    ctx.scale(dpr, dpr);

    const radii = barWidth / 2;
    const startX =
      liveCanvas.width / dpr -
      peaksWindow.size * barStep -
      offset -
      Math.round(liveCanvas.width / dpr / 2);

    ctx.fillStyle = '#6366f1';
    for (let i = 0; i < peaksWindow.size; i++) {
      const peak = peaksWindow.get(i);
      const x = startX + barStep * i;
      if (x > -barStep) {
        const barHeight = Math.round(Math.max(peak * canvasHeight, 3));
        ctx.beginPath();
        ctx.roundRect(x, canvasHeight / 2 - barHeight / 2, barWidth, barHeight, radii);
        ctx.fill();
      }
    }

    ctx.fillStyle = '#cbd5e1';
    for (let e = liveCanvas.width / dpr / 2 - offset; e <= liveCanvas.width / dpr; e += barStep) {
      ctx.beginPath();
      ctx.roundRect(e, canvasHeight / 2 - barWidth / 2, barWidth, barWidth, radii);
      ctx.fill();
    }

    if (startX > 0) {
      ctx.fillStyle = '#cbd5e1';
      for (let x = startX - barStep; x > -barStep; x -= barStep) {
        ctx.beginPath();
        ctx.roundRect(x, canvasHeight / 2 - barWidth / 2, barWidth, barWidth, radii);
        ctx.fill();
      }
    }
  }

  // --- static waveform + playback cursor, shown once a recording exists ---

  // $state for the same reason as liveCanvas above: only mounted once the
  // {:else if audioUrl} branch renders.
  let baseCanvas: HTMLCanvasElement | undefined = $state();
  let progressCanvas: HTMLCanvasElement | undefined = $state();
  let peaks: Float32Array = new Float32Array(0);
  let progress = $state(0);
  let decodedSamples: Float32Array | null = $state(null);
  let decodedForUrl: string | undefined;

  async function decodeAudio(url: string): Promise<Float32Array> {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const audioContext = new AudioContext();
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer.getChannelData(0);
    } finally {
      void audioContext.close();
    }
  }

  $effect(() => {
    if (!audioUrl) {
      decodedSamples = null;
      decodedForUrl = undefined;
      return;
    }
    if (decodedForUrl === audioUrl) return;

    const url = audioUrl;
    decodedForUrl = url;
    decodeAudio(url)
      .then((samples) => {
        if (decodedForUrl === url) {
          decodedSamples = samples;
        }
      })
      .catch((err) => {
        console.error('Error decoding audio for waveform:', err);
      });
  });

  $effect(() => {
    if (!audioUrl || !decodedSamples || !baseCanvas || !progressCanvas || !containerWidth) return;

    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(containerWidth * dpr);
    const targetHeight = Math.round(canvasHeight * dpr);
    // Only the backing-store resolution is set imperatively here; CSS size
    // is set declaratively in the template below (baseCanvas has no other
    // reason to touch style, but progressCanvas's style is also driven by
    // the reactive clip-path, and that binding replaces the whole `style`
    // attribute on every update — an imperative canvas.style.width here
    // would just get wiped out the next time `progress` changes).
    for (const canvas of [baseCanvas, progressCanvas]) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const numberOfPeaks = Math.max(1, Math.floor(containerWidth / barStep));
    peaks = calculatePeaks(decodedSamples, numberOfPeaks);

    drawStaticBars(baseCanvas, '#cbd5e1');
    drawStaticBars(progressCanvas, '#6366f1');
  });

  function drawStaticBars(canvas: HTMLCanvasElement, color: string) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const radii = barWidth / 2;
    ctx.fillStyle = color;
    for (let i = 0; i < peaks.length; i++) {
      const x = barStep * i;
      const barHeight = Math.round(Math.max(peaks[i] * canvasHeight, 3));
      ctx.beginPath();
      ctx.roundRect(x, canvasHeight / 2 - barHeight / 2, barWidth, barHeight, radii);
      ctx.fill();
    }
  }

  // The playback cursor: a clip-path on the (identically drawn) indigo
  // progress canvas reveals it up to the current position, like wavesurfer's
  // progress layer, plus a thin cursor line at that exact x position. Purely
  // a style tweak every frame, no canvas redraw, so it's cheap to run always.
  $effect(() => {
    if (!audioUrl) return;

    let raf: number;
    const tick = () => {
      if (audioElement && audioElement.duration) {
        progress = audioElement.currentTime / audioElement.duration;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  });

  function onSeek(e: MouseEvent) {
    if (!audioElement || !audioElement.duration) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audioElement.currentTime = fraction * audioElement.duration;
  }

  function onSeekKeydown(e: KeyboardEvent) {
    if (!audioElement || !audioElement.duration) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      audioElement.currentTime = Math.min(audioElement.duration, audioElement.currentTime + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      audioElement.currentTime = Math.max(0, audioElement.currentTime - 1);
    }
  }
</script>

<div bind:clientWidth={containerWidth} class="block w-full">
  {#if getNextPeak}
    <canvas bind:this={liveCanvas} class="block w-full"></canvas>
  {:else if audioUrl}
    <div
      class="relative cursor-pointer"
      onclick={onSeek}
      onkeydown={onSeekKeydown}
      role="slider"
      tabindex="0"
      aria-label="Playback position"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(progress * 100)}
    >
      <canvas
        bind:this={baseCanvas}
        class="block"
        style="width: {containerWidth}px; height: {canvasHeight}px;"
      ></canvas>
      <canvas
        bind:this={progressCanvas}
        class="pointer-events-none absolute inset-0 block"
        style="width: {containerWidth}px; height: {canvasHeight}px; clip-path: inset(0 {100 -
          progress * 100}% 0 0);"
      ></canvas>
      <div
        class="pointer-events-none absolute top-0 bottom-0 w-px bg-indigo-600"
        style="left: {progress * 100}%"
      ></div>
    </div>
    <audio bind:this={audioElement} src={audioUrl} loop autoplay preload="auto" class="hidden"
    ></audio>
  {/if}
</div>
