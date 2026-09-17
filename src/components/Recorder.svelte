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

  let statusText = $derived(
    recording
      ? 'Recording…'
      : audioUrl
        ? playing
          ? 'Playing…'
          : 'Tap play to listen'
        : 'Tap to record'
  );

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
        // await delay(200);
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

<div
  class="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white p-10 shadow-xl shadow-slate-200/60 sm:p-16"
>
  <div class="mb-10 flex flex-col items-center gap-2 text-center">
    <h1 class="text-xl font-semibold tracking-tight text-slate-900">Sound Mirror</h1>
    <p class="text-sm text-slate-500">Record your voice, hear it back instantly.</p>
  </div>

  <div class="mb-10">
    {#if audioUrl}
      <div class="w-full rounded-2xl border border-slate-200 bg-slate-50 p-8">
        <Surfer {audioUrl} bind:audioElement />
      </div>
    {:else}
      <div
        class="flex h-[96px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-8 text-center text-sm text-slate-400"
      >
        Your recording will appear here
      </div>
    {/if}
  </div>

  <div class="flex flex-col items-center gap-6">
    <div class="flex items-center justify-center gap-10">
      <div class="relative">
        {#if recording}
          <span
            class="absolute inset-0 -z-10 animate-ping rounded-full bg-red-400/60"
            aria-hidden="true"
          ></span>
        {/if}
        <!-- disabled={recording && !stopRecord} -->
        <!-- data-record={recording ? '' : null}  -->
        <Button
          bind:element={recordButtonElement}
          class={[
            'h-32 w-32 border-2 border-red-300 bg-white text-red-500 shadow-sm',
            'hover:border-red-400 hover:bg-red-50',
            'focus-visible:ring-red-200',
            'data-record:not-disabled:border-red-500 data-record:not-disabled:bg-red-500 data-record:not-disabled:text-white data-record:not-disabled:shadow-red-200 data-record:not-disabled:hover:bg-red-600',
          ]}
          disabled={recording && !stopRecord}
          data-record={recording ? '' : null}
          onclick={onrecord}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          <Mic size={26} />
        </Button>
      </div>

      <Button
        bind:element={pauseButtonElement}
        class={[
          'h-28 w-28 border border-transparent bg-slate-900 text-white shadow-sm',
          'hover:bg-slate-700',
          'focus-visible:ring-slate-300',
          'disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none',
        ]}
        disabled={audioElement ? null : ''}
        onclick={onpause}
        aria-label={playing ? 'Pause playback' : 'Play recording'}
      >
        {#if audioElement}
          {#if playing}
            <Pause size={20} />
          {:else}
            <Play size={20} />
          {/if}
        {:else}
          <Pause size={20} />
        {/if}
      </Button>
    </div>

    <p class="flex items-center gap-2 text-sm text-slate-500">
      {#if recording}
        <span class="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true"></span>
      {/if}
      {statusText}
    </p>
  </div>
</div>
