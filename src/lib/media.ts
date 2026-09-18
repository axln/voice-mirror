import { createPeakSampler } from '~/lib/waveform';

export async function listAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'audioinput');
}

export async function startAudioRecord(
  deviceId?: string
): Promise<{ stopRecord: () => Promise<Blob>; getNextPeak: () => number }> {
  if (navigator.mediaDevices) {
    let chunks: Blob[] = [];
    let resolve: ((data: Blob) => void) | null = null;
    let reject: ((err: Error) => void) | null = null;

    // console.log('constraints:', navigator.mediaDevices.getSupportedConstraints());
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
    });

    stream.getTracks().forEach(function (track) {
      console.log('Applied audio settings:', track.getSettings());
      console.log('track:', track.getCapabilities());
    });
    // console.log('stream:', stream);

    const recorder = new MediaRecorder(stream);
    // console.log('recorder:', recorder);

    const peakSampler = createPeakSampler(stream);

    recorder.ondataavailable = function (e) {
      // console.log('data:', e);
      chunks.push(e.data);
    };

    recorder.onerror = (e) => {
      console.warn('recorder error:', e);
      if (reject) {
        reject(new Error('Recorder error: ' + JSON.stringify(e)));
        reject = null;
      }
    };

    recorder.onstop = (e) => {
      // console.log('stop:', e);
      if (resolve) {
        resolve(new Blob(chunks, { type: recorder.mimeType }));
        resolve = null;
      }
      chunks = [];
      peakSampler.dispose();
      stream.getTracks().forEach(function (track) {
        track.stop();
      });
    };

    recorder.start();

    let stopCalled = false;
    const stopRecord = (): Promise<Blob> => {
      if (stopCalled) {
        throw new Error('stopRecord has already been called.');
      }

      stopCalled = true;
      recorder.stop();
      return new Promise((rslv, rjkt) => {
        resolve = rslv;
        reject = rjkt;
      });
    };

    return { stopRecord, getNextPeak: peakSampler.getNextPeak };
  } else {
    throw new Error('User media not supported.');
  }
}
