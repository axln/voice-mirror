<script lang="ts">
  import WaveSurfer from 'wavesurfer.js';
  import { onMount } from 'svelte';

  let {
    audioUrl,
    audioElement = $bindable(),
  }: { audioUrl?: string; audioElement?: HTMLAudioElement } = $props();

  let waveform: HTMLDivElement;
  let surfer: WaveSurfer | undefined;

  onMount(() => {
    const ws = WaveSurfer.create({
      container: waveform,
      waveColor: '#cbd5e1',
      progressColor: '#6366f1',
      cursorColor: '#6366f1',
      cursorWidth: 1,
      autoplay: true,
      hideScrollbar: true,
      normalize: false,
      height: 64,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
    });
    audioElement = ws.getMediaElement();

    surfer = ws;

    return () => {
      ws.destroy();
      surfer = undefined;
      audioElement = undefined;
    };
  });

  $effect(() => {
    if (surfer && audioUrl) {
      const ws = surfer;
      ws.load(audioUrl).then(() => {
        // ws.getMediaElement().loop = true;
      });
      ws.getMediaElement().loop = true;

      return () => {
        ws.empty();
      };
    }
  });
</script>

<div bind:this={waveform}></div>
