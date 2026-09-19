// Minimum decibel floor used when converting amplitudes to perceptual peaks.
const MIN_DB = -45;

/**
 * Converts a raw linear amplitude (0..1) into the same perceptual, "heavy at
 * the bottom" 0..1 scale used for both live and static peaks: dB-scaled,
 * floored at MIN_DB, then squared so quiet sound reads as visually quieter.
 *
 * @param amplitude - Raw linear amplitude sample, in the range 0..1.
 * @returns The perceptually-scaled peak value, in the range 0..1.
 */
function amplitudeToPeak(amplitude: number): number {
  if (amplitude < 0.0001) {
    return 0;
  }
  let db = 20 * Math.log10(amplitude);
  if (db < MIN_DB) {
    db = MIN_DB;
  }
  const linearNormalized = (db - MIN_DB) / (0 - MIN_DB);
  return Math.pow(linearNormalized, 2);
}

/**
 * Downsamples decoded PCM samples (-1..1) into `numberOfPeaks` bars, each the
 * loudest sample in its slice of the recording.
 *
 * @param samples - Decoded PCM samples for the recording, in the range -1..1.
 * @param numberOfPeaks - Number of display bars to downsample into.
 * @returns One perceptually-scaled peak (0..1) per bar, in `numberOfPeaks`-length order.
 */
export function calculatePeaks(samples: Float32Array, numberOfPeaks: number): Float32Array {
  const peaks = new Float32Array(numberOfPeaks);
  const totalSamples = samples.length;
  if (totalSamples === 0 || numberOfPeaks <= 0) {
    return peaks;
  }

  const samplesPerPeak = totalSamples / numberOfPeaks;

  for (let p = 0; p < numberOfPeaks; p++) {
    const startIdx = Math.floor(p * samplesPerPeak);
    const endIdx = Math.min(Math.floor((p + 1) * samplesPerPeak), totalSamples);

    let max = 0;
    for (let i = startIdx; i < endIdx; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > max) {
        max = abs;
      }
    }

    peaks[p] = amplitudeToPeak(max);
  }

  return peaks;
}

/**
 * Live peak sampler for the in-progress recording waveform: an AnalyserNode
 * tapped off the same MediaStream the recorder uses (not connected to the
 * speakers, so it doesn't cause feedback). Each getNextPeak() call reports the
 * loudest sample since the previous call, on the same 0..1 scale as
 * calculatePeaks above.
 *
 * @param stream - The live MediaStream to tap for level metering (the same one being recorded).
 * @returns `getNextPeak` — reports the loudest sample since the previous call, in the range 0..1.
 * `dispose` — disconnects the tap and closes the AudioContext; call once the recording stops.
 */
export function createPeakSampler(stream: MediaStream): {
  getNextPeak: () => number;
  dispose: () => void;
} {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const dataArray = new Float32Array(analyser.fftSize);
  let lastSampleTime = 0;

  function getNextPeak(): number {
    analyser.getFloatTimeDomainData(dataArray);

    let startIndex = 0;
    if (lastSampleTime > 0) {
      const elapsedMs = performance.now() - lastSampleTime;
      let requiredSamples = Math.round((elapsedMs / 1000) * audioContext.sampleRate);
      requiredSamples = Math.min(requiredSamples, dataArray.length);
      requiredSamples = Math.max(requiredSamples, 1);
      startIndex = dataArray.length - requiredSamples;
    }
    lastSampleTime = performance.now();

    let max = 0;
    for (let i = startIndex; i < dataArray.length; i++) {
      const abs = Math.abs(dataArray[i]);
      if (abs > max) {
        max = abs;
      }
    }

    return amplitudeToPeak(max);
  }

  return {
    getNextPeak,
    dispose: () => {
      source.disconnect();
      analyser.disconnect();
      void audioContext.close();
    },
  };
}
