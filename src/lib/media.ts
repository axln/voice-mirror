export async function startRecordAudio() {
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
      },
    });
    /* stream.getTracks().forEach(function (track) {
      console.log('track:', track.getCapabilities());
    }); */
    // console.log('stream:', stream);

    const recorder = new MediaRecorder(stream);
    // console.log('recorder:', recorder);

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

    return stopRecord;
  } else {
    throw new Error('User media not supported.');
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
