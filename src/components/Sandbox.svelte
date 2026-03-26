<script lang="ts">
  import { onMount } from 'svelte';
  import WaveSurfer from 'wavesurfer.js';
  import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';

  let div: HTMLDivElement;

  let record: RecordPlugin | undefined;

  onMount(() => {
    if (div) {
      const waveSurfer = WaveSurfer.create({
        container: div,
        // waveColor: '#d6d6d6',
        waveColor: '#51da4c',
        progressColor: '#51da4c',
        normalize: false,
        // autoCenter: false,
        // autoScroll: true,
        // hideScrollbar: true,
        height: 100,
        barWidth: 2,
        mediaControls: true,
      });

      // Initialize the Record plugin
      record = waveSurfer.registerPlugin(
        RecordPlugin.create({
          // renderRecordedAudio: true,
          scrollingWaveform: false,
          // continuousWaveform: false,
          // continuousWaveformDuration: 5,
        })
      );

      // Load a sample audio file (you can replace this with your own)
      // waveSurfer.load('https://www.kozco.com/tech/piano2-CoolEdit.mp3');

      return () => {
        waveSurfer.destroy();
      };
    }
  });
</script>

<div>
  <div bind:this={div} class="my-5 border border-gray-300"></div>

  <div>
    <button
      on:click={() => {
        if (record) {
          if (record.isRecording()) {
            record.stopRecording();
          } else {
            record.startRecording({
              channelCount: 1,
              autoGainControl: false,
              echoCancellation: false,
              noiseSuppression: false,
            });
          }
        }
      }}
      class="mt-4 rounded bg-blue-500 px-4 py-2 text-white"
    >
      {#if record && record.isRecording()}
        Stop Recording
      {:else}
        Start Recording
      {/if}
    </button>
  </div>
</div>
