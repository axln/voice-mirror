<script lang="ts">
  import { startAudioRecord } from '~/lib/media';
  import { delay } from '~/lib/timer';
  import Button from '~/components/Button.svelte';
  import Mic from '~/components/icons/Mic.svelte';
  import Play from '~/components/icons/Play.svelte';
  import Pause from '~/components/icons/Pause.svelte';
  import Surfer from './Surfer.svelte';

  let recording = $state(false);
  let playing = $state(true);
  let stopRecord: (() => Promise<Blob>) | null = $state(null);
  let audio: Blob | null = $state(null);
  let audioUrl: string | null = $state(null);

  // svelte-ignore non_reactive_update
  let recordButtonElement: HTMLButtonElement;
  // svelte-ignore non_reactive_update
  let pauseButtonElement: HTMLButtonElement;
  let audioElement: HTMLAudioElement | undefined = $state(undefined);

  $effect(() => {
    if (audio) {
      const objUrl = (audioUrl = URL.createObjectURL(audio));
      return () => {
        URL.revokeObjectURL(objUrl);
        audioUrl = null;
      };
    }
  });

  $effect(() => {
    if (audioElement) {
      audioElement.onplay = () => {
        playing = true;
      };
      audioElement.onpause = () => {
        playing = false;
      };
    }
  });

  async function onrecord() {
    console.log('onrecord');
    if (recording) {
      if (stopRecord) {
        const stopPromise = stopRecord();
        stopRecord = null;
        stopPromise
          .then((blob) => {
            audio = blob;
            // console.log('Recorded audio blob:', audio);
          })
          .catch((err) => {
            console.error('Error stopping recording:', err);
          })
          .finally(() => {
            recording = false;
          });
      } else {
        console.warn('Recording is still starting...');
      }
    } else {
      if (audioElement && !audioElement.paused) {
        audioElement.pause();
        // just in case
        // if we test with audio loopback recording, delay allows not to record the previous playing record
        await delay(200);
      }

      audio = null;
      recording = true;
      playing = false;
      startAudioRecord()
        .then((stop) => {
          stopRecord = stop;
        })
        .catch((err) => {
          console.error('Error starting recording:', err);
          recording = false;
        });
    }
  }

  function onpause() {
    if (!audioElement) {
      return;
    }
    if (playing) {
      audioElement.pause();
      playing = false;
    } else {
      audioElement.play();
      playing = true;
    }
  }
</script>

<svelte:window
  onkeydowncapture={(e) => {
    if (e.code === 'Space') {
      console.log('Space keydown');
      if (document.activeElement !== recordButtonElement) {
        e.preventDefault();

        onrecord();
      }
    } else if (e.code == 'Escape') {
      console.log('Escape keydown');
      if (audioElement) {
        audioElement.pause();
      }
    } else if (e.code == 'Enter') {
      if (audioElement) {
        if (document.activeElement !== pauseButtonElement) {
          e.preventDefault();
          audioElement.play();
        }
      }
    }
  }}
/>

<div class="flex justify-center gap-4">
  <!-- disabled={recording && !stopRecord} -->
  <!-- data-record={recording ? '' : null}  -->
  <Button
    bind:element={recordButtonElement}
    class={[
      'text-red-500 hover:text-red-600',
      'data-record:not-disabled:border-red-600 data-record:not-disabled:bg-red-500 data-record:not-disabled:text-white',
    ]}
    disabled={recording && !stopRecord}
    data-record={recording ? '' : null}
    onclick={onrecord}
  >
    <Mic size={24} />
  </Button>

  <Button bind:element={pauseButtonElement} disabled={audioElement ? null : ''} onclick={onpause}>
    {#if audioElement}
      {#if playing}
        <Pause size={20} />
      {:else}
        <Play size={20} />
      {/if}
    {:else}
      <Pause size={20} />{/if}
  </Button>
</div>

{#if audioUrl}
  <!-- <audio bind:this={audioElement} autoplay loop src={audioUrl}></audio> -->
  <Surfer {audioUrl} bind:audioElement />
{/if}
