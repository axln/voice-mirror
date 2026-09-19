<script lang="ts">
  import { startAudioRecord, listAudioInputDevices } from '~/lib/media';
  import { delay } from '~/lib/timer';
  import Button from '~/components/Button.svelte';
  import Mic from '~/components/icons/Mic.svelte';
  import Play from '~/components/icons/Play.svelte';
  import Pause from '~/components/icons/Pause.svelte';
  import Stop from '~/components/icons/Stop.svelte';
  import Settings from '~/components/icons/Settings.svelte';
  import Check from '~/components/icons/Check.svelte';
  import Logo from '~/components/icons/Logo.svelte';
  import Waveform from './Waveform.svelte';

  let recording = $state(false);
  let playing = $state(true);
  let stopRecord: (() => Promise<Blob>) | null = $state(null);
  let getNextPeak: (() => number) | null = $state(null);
  let audio: Blob | null = $state(null);
  let audioUrl: string | null = $state(null);
  let audioInputDevices: MediaDeviceInfo[] = $state([]);
  let selectedDeviceId: string = $state('');
  let showMicMenu = $state(false);
  let micMenuWrapperElement: HTMLDivElement | undefined = $state(undefined);

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

  async function refreshAudioInputDevices() {
    const devices = await listAudioInputDevices();
    audioInputDevices = devices;
    if (selectedDeviceId && !devices.some((d) => d.deviceId === selectedDeviceId)) {
      selectedDeviceId = '';
    }
  }

  $effect(() => {
    refreshAudioInputDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshAudioInputDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', refreshAudioInputDevices);
    };
  });

  function selectDevice(deviceId: string) {
    selectedDeviceId = deviceId;
    showMicMenu = false;
  }

  // Chrome/Edge synthesize an extra audioinput entry with deviceId "default"
  // (label "Default - <device name>") representing the OS default mic, on top
  // of the real per-device entries. When present, it replaces our own
  // "System default" item instead of duplicating it.
  let hasBrowserDefaultDevice = $derived(audioInputDevices.some((d) => d.deviceId === 'default'));

  // Before mic permission is granted, browsers still list audioinput devices
  // but with blank labels (and often blank/indistinguishable deviceIds), so
  // there's nothing meaningful to pick between yet.
  let hasMicPermission = $derived(audioInputDevices.some((d) => d.label));

  async function onrecord() {
    console.log('onrecord');
    if (recording) {
      if (stopRecord) {
        const stopPromise = stopRecord();
        stopRecord = null;
        getNextPeak = null;
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
      startAudioRecord(selectedDeviceId || undefined)
        .then(({ stopRecord: stop, getNextPeak: peak }) => {
          stopRecord = stop;
          getNextPeak = peak;
          // labels are only populated once mic permission has been granted
          refreshAudioInputDevices();
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
  onclick={(e) => {
    if (showMicMenu && micMenuWrapperElement && !micMenuWrapperElement.contains(e.target as Node)) {
      showMicMenu = false;
    }
  }}
  onkeydowncapture={(e) => {
    if (e.code === 'Space') {
      console.log('Space keydown');
      if (document.activeElement !== recordButtonElement) {
        e.preventDefault();

        onrecord();
      }
    } else if (e.code == 'Escape') {
      console.log('Escape keydown');
      if (showMicMenu) {
        showMicMenu = false;
      } else if (audioElement) {
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

<div class="flex w-full max-w-md flex-col items-center">
  <div
    class="w-full rounded-3xl bg-white p-10 sm:border sm:border-slate-200/70 sm:p-16 sm:shadow-xl sm:shadow-slate-200/60"
  >
    <div class="mb-14 flex flex-col items-center gap-2 text-center">
      <div class="flex items-center justify-center gap-2">
        <Logo size={32} />
        <h1 class="ml-2 text-2xl font-semibold tracking-tight text-indigo-500 sm:text-xl">
          Voice Mirror
        </h1>
      </div>
      <p class="text-base text-slate-500 sm:text-sm">Record your voice, hear it back instantly.</p>
    </div>

    <div class="mb-10">
      {#if recording}
        <div
          class="flex h-60 w-full items-center rounded-2xl border border-slate-200 bg-slate-50 px-8"
        >
          <Waveform {getNextPeak} />
        </div>
      {:else if audioUrl}
        <div
          class="flex h-60 w-full items-center rounded-2xl border border-slate-200 bg-slate-50 px-8"
        >
          <Waveform {audioUrl} bind:audioElement />
        </div>
      {:else}
        <div
          class="flex h-60 w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-8 text-center text-base text-slate-400 sm:text-sm"
        >
          Press the button to start recording.
        </div>
      {/if}
    </div>

    <div class="flex flex-col items-center gap-10">
      <div class="relative flex w-full items-center justify-center gap-10">
        <Button
          bind:element={recordButtonElement}
          class={[
            'h-36 w-36 border-2 border-red-300 bg-white text-red-500 shadow-sm sm:h-32 sm:w-32',
            'hover:border-red-400 hover:bg-red-50',
            'focus-visible:ring-red-200',
            'data-record:not-disabled:animate-glow-pulse data-record:not-disabled:border-red-500 data-record:not-disabled:bg-red-500 data-record:not-disabled:text-white data-record:not-disabled:hover:bg-red-600',
          ]}
          disabled={recording && !stopRecord}
          data-record={recording ? '' : null}
          onclick={onrecord}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {#if recording}
            <Stop size={26} />
          {:else}
            <Mic size={26} />
          {/if}
        </Button>

        <Button
          bind:element={pauseButtonElement}
          class={[
            'h-32 w-32 border border-slate-200 bg-white text-slate-600 shadow-sm sm:h-28 sm:w-28',
            'hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700',
            'focus-visible:ring-slate-300',
            'disabled:border-slate-100 disabled:bg-white disabled:text-slate-300 disabled:shadow-none',
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

        <div class="absolute top-1/2 right-0 -translate-y-1/2" bind:this={micMenuWrapperElement}>
          <Button
            class={[
              'h-14 w-14 border border-slate-200 bg-white text-slate-500 shadow-sm',
              'hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700',
              'focus-visible:ring-slate-200',
            ]}
            onclick={() => (showMicMenu = !showMicMenu)}
            aria-haspopup="true"
            aria-expanded={showMicMenu}
            aria-label="Select microphone"
          >
            <Settings size={18} />
          </Button>

          {#if showMicMenu}
            <div
              class="absolute top-full right-0 z-20 mt-2 w-max max-w-[min(22rem,calc(100vw-3rem))] rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-xl shadow-slate-300/40"
            >
              <p class="px-3 pt-2 pb-1 text-xs font-medium text-slate-500">Microphone:</p>
              <ul>
                {#if hasMicPermission}
                  {#if !hasBrowserDefaultDevice}
                    <li>
                      <button
                        type="button"
                        class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        onclick={() => selectDevice('')}
                      >
                        <span class="flex w-5 shrink-0 items-center justify-center">
                          {#if selectedDeviceId === ''}
                            <Check size={20} />
                          {/if}
                        </span>
                        <span class="wrap-break-word">System default</span>
                      </button>
                    </li>
                  {/if}
                  {#each audioInputDevices as device, i (device.deviceId)}
                    {@const deviceValue = device.deviceId === 'default' ? '' : device.deviceId}
                    <li>
                      <button
                        type="button"
                        class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        onclick={() => selectDevice(deviceValue)}
                      >
                        <span class="flex w-5 shrink-0 items-center justify-center">
                          {#if selectedDeviceId === deviceValue}
                            <Check size={20} />
                          {/if}
                        </span>
                        <span class="wrap-break-word">{device.label || `Microphone ${i + 1}`}</span>
                      </button>
                    </li>
                  {/each}
                {:else}
                  <li class="px-3 py-2 text-sm text-slate-300">Microphone permission required</li>
                {/if}
              </ul>
            </div>
          {/if}
        </div>
      </div>

      <p
        class="hidden flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400 sm:flex"
      >
        <span class="inline-flex items-center gap-1.5">
          <kbd
            class="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[11px] text-slate-500"
            >Space</kbd
          >
          record / stop
        </span>
        <span class="inline-flex items-center gap-1.5">
          <kbd
            class="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[11px] text-slate-500"
            >Esc</kbd
          >
          pause
        </span>
        <span class="inline-flex items-center gap-1.5">
          <kbd
            class="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[11px] text-slate-500"
            >Enter</kbd
          >
          play
        </span>
      </p>
    </div>
  </div>

  <p class="mt-4 text-center text-xs text-slate-300">v{__APP_VERSION__}</p>
</div>
