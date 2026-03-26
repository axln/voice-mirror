<script lang="ts">
  import { startRecordAudio, delay } from '~/lib/media';
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
  let buttonElement: HTMLButtonElement;

  // svelte-ignore non_reactive_update
  let audioElement: HTMLAudioElement | undefined = undefined;

  $effect(() => {
    if (audio) {
      const objUrl = (audioUrl = URL.createObjectURL(audio));
      return () => {
        URL.revokeObjectURL(objUrl);
        audioUrl = null;
      };
    }
  });

  async function onrecord() {
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
        await delay(200);
      }

      audio = null;
      recording = true;
      startRecordAudio()
        .then((stop) => {
          stopRecord = stop;
        })
        .catch((err) => {
          console.error('Error starting recording:', err);
          recording = false;
        });
    }
  }
</script>

<svelte:window
  onkeydowncapture={(e) => {
    console.log('window keydown');
    if (e.code === 'Space') {
      console.log('spacebar');
      if (document.activeElement !== buttonElement) {
        e.preventDefault();
        console.log('onrecord');
        onrecord();
      }
    }
  }}
/>

<div class="flex justify-center gap-4">
  <Button
    bind:element={buttonElement}
    class={[
      'text-red-400',
      'data-record:border-red-600 data-record:bg-red-500 data-record:text-white',
    ]}
    disabled={recording && !stopRecord}
    data-record={recording ? '' : null}
    onclick={onrecord}
  >
    <Mic size={24} />
  </Button>

  <Button disabled>
    {#if playing}
      <Pause size={20} />
    {:else}
      <Play size={20} />
    {/if}
  </Button>
</div>

{#if audioUrl}
  <!-- <audio bind:this={audioElement} autoplay loop src={audioUrl}></audio> -->
  <Surfer {audioUrl} {audioElement} />
{/if}
