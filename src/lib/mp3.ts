import { Mp3Encoder } from '@breezystack/lamejs';

// Browsers can't encode MP3 natively, so decode the recording and encode it with lamejs.
// shortcut: encodes mono only (recordings are mono), blocking the main thread; move to a worker if long recordings stutter.
export async function encodeMp3(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    const float = buffer.getChannelData(0);
    const samples = new Int16Array(float.length);
    for (let i = 0; i < float.length; i++) {
      samples[i] = Math.max(-1, Math.min(1, float[i])) * 0x7fff;
    }
    const encoder = new Mp3Encoder(1, buffer.sampleRate, 128);
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < samples.length; i += 1152) {
      const chunk = encoder.encodeBuffer(samples.subarray(i, i + 1152));
      if (chunk.length) chunks.push(chunk);
    }
    chunks.push(encoder.flush());
    return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
  } finally {
    ctx.close();
  }
}
