// Browser microphone capture. Covered by the browser tests.

export interface ActiveRecording {
  stop(): Promise<Blob>;
  cancel(): void;
  /** Current loudness from 0 to 1, for the level meter. */
  level(): number;
}

/** The study scores audio without denoising and measures intensity, so ask for raw input. */
const CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
};

const stopTracks = (stream: MediaStream) => stream.getTracks().forEach((track) => track.stop());

/** Calls `onInterrupted` if the microphone is lost or the page is hidden while recording. */
function watchInterruptions(stream: MediaStream, onInterrupted: () => void): () => void {
  const onVisibility = () => {
    if (document.visibilityState === "hidden") onInterrupted();
  };
  stream.getAudioTracks().forEach((track) => track.addEventListener("ended", onInterrupted));
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    stream.getAudioTracks().forEach((track) => track.removeEventListener("ended", onInterrupted));
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

function meter(stream: MediaStream) {
  const context = new AudioContext();
  void context.resume();
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  context.createMediaStreamSource(stream).connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  return {
    level() {
      analyser.getFloatTimeDomainData(samples);
      return samples.reduce((peak, s) => Math.max(peak, Math.abs(s)), 0);
    },
    close: () => {
      if (context.state !== "closed") void context.close();
    },
  };
}

function capture(stream: MediaStream, onInterrupted: () => void): ActiveRecording {
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  const input = meter(stream);
  const unwatch = watchInterruptions(stream, onInterrupted);
  const release = () => {
    unwatch();
    stopTracks(stream);
    input.close();
  };
  const take = () => new Blob(chunks, { type: recorder.mimeType });
  recorder.start();

  return {
    level: input.level,
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(take());
        if (recorder.state === "inactive") resolve(take());
        else recorder.stop();
        release();
      }),
    cancel() {
      if (recorder.state !== "inactive") recorder.stop();
      release();
    },
  };
}

export async function startRecording(onInterrupted: () => void): Promise<ActiveRecording> {
  const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
  try {
    return capture(stream, onInterrupted);
  } catch (error) {
    stopTracks(stream);
    throw error;
  }
}
