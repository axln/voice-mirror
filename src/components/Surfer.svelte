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
      waveColor: '#d6d6d6',
      progressColor: '#51da4c',
      autoplay: true,
      hideScrollbar: true,
      normalize: false,
      height: 50,
      barWidth: 2,
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
