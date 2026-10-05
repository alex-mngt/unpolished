export type TestPreset = "mono" | "left" | "right";

/**
 * Called once per animation frame while audio is playing.
 * `left` and `right` are shared buffers: read them, never write or keep them.
 * The last `fresh` samples are the ones that arrived since the previous frame.
 */
export type FrameCallback = (
  left: Float32Array,
  right: Float32Array,
  fresh: number,
  dtMs: number,
) => void;

export interface Subscription {
  /** Skip this subscriber's frames, e.g. while its canvas is offscreen. */
  setActive: (active: boolean) => void;
  unsubscribe: () => void;
}

interface Subscriber {
  onFrame: FrameCallback;
  onIdle?: () => void;
  active: boolean;
}

interface Graph {
  ctx: AudioContext;
  input: GainNode;
  volume: GainNode;
  analyserL: AnalyserNode;
  analyserR: AnalyserNode;
}

interface TestSignal {
  osc: OscillatorNode;
  gainL: GainNode;
  gainR: GainNode;
  merger: ChannelMergerNode;
}

const FFT_SIZE = 2048;
// Keep ticking this long after the last source stops so traces can fade out
// and needles can fall back to rest.
const TAIL_MS = 1500;
// Frame gaps longer than this (tab was hidden) are treated as this long.
const MAX_DT_MS = 100;
const TEST_FREQUENCY = 220;
/** Peak level of the test tone until `setTestLevel` is called. */
export const DEFAULT_TEST_LEVEL_DBFS = -1.9;
// The test tone is tapped at its nominal level but always heard at this peak
// amplitude (about -22 dBFS), whatever that level is.
const TEST_HEARD_AMPLITUDE = 0.08;

const PRESET_ROUTING: Record<TestPreset, [number, number]> = {
  mono: [1, 1],
  left: [1, 0],
  right: [0, 1],
};

/**
 * One AudioContext, one stereo tap and one animation loop shared by every
 * visualizer. Lives outside React: nothing here triggers a render.
 *
 *   source -> input (forced stereo) -> splitter -> analyserL / analyserR
 *                                   -> volume   -> speakers
 */
export class AudioEngine {
  private graph: Graph | null = null;
  private test: TestSignal | null = null;
  private attached = new WeakSet<HTMLMediaElement>();
  private subscribers = new Set<Subscriber>();
  private left = new Float32Array(FFT_SIZE);
  private right = new Float32Array(FFT_SIZE);
  private mediaPlaying = false;
  private testPreset: TestPreset = "mono";
  private testAmplitude = 10 ** (DEFAULT_TEST_LEVEL_DBFS / 20);
  private volumeLevel = 1;
  private raf = 0;
  private lastFrame = 0;
  private tailUntil = 0;

  /** Must first be reached from a user gesture (browser autoplay policy). */
  private ensureGraph(): Graph {
    if (this.graph) return this.graph;

    const ctx = new AudioContext();
    const input = ctx.createGain();
    // Upmix mono sources so the right channel is not read as silence.
    input.channelCount = 2;
    input.channelCountMode = "explicit";
    input.channelInterpretation = "speakers";

    const splitter = ctx.createChannelSplitter(2);
    const analyserL = ctx.createAnalyser();
    const analyserR = ctx.createAnalyser();
    analyserL.fftSize = analyserR.fftSize = FFT_SIZE;
    input.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);

    const volume = ctx.createGain();
    input.connect(volume);
    volume.connect(ctx.destination);

    this.graph = { ctx, input, volume, analyserL, analyserR };
    this.applyVolume();
    return this.graph;
  }

  attachMedia(element: HTMLMediaElement) {
    if (this.attached.has(element)) return;
    const { ctx, input } = this.ensureGraph();
    ctx.createMediaElementSource(element).connect(input);
    this.attached.add(element);
  }

  setMediaPlaying(playing: boolean) {
    this.mediaPlaying = playing;
    this.sourcesChanged();
  }

  startTest(preset: TestPreset) {
    if (this.test) return;
    const { ctx, input } = this.ensureGraph();
    const osc = ctx.createOscillator();
    osc.frequency.value = TEST_FREQUENCY;
    const gainL = ctx.createGain();
    const gainR = ctx.createGain();
    const merger = ctx.createChannelMerger(2);
    osc.connect(gainL).connect(merger, 0, 0);
    osc.connect(gainR).connect(merger, 0, 1);
    merger.connect(input);
    osc.start();
    this.test = { osc, gainL, gainR, merger };
    this.setTestPreset(preset);
    this.applyVolume();
    this.sourcesChanged();
  }

  setTestPreset(preset: TestPreset) {
    this.testPreset = preset;
    this.applyTestGains();
  }

  /** Peak level of the tone as the visualizers see it; can be set at any time. */
  setTestLevel(dbfs: number) {
    this.testAmplitude = 10 ** (dbfs / 20);
    this.applyTestGains();
    this.applyVolume();
  }

  stopTest() {
    if (!this.test) return;
    this.test.osc.stop();
    this.test.merger.disconnect();
    this.test = null;
    this.applyVolume();
    this.sourcesChanged();
  }

  setVolume(level: number) {
    this.volumeLevel = level;
    this.applyVolume();
  }

  subscribe(onFrame: FrameCallback, onIdle?: () => void): Subscription {
    const subscriber: Subscriber = { onFrame, onIdle, active: true };
    this.subscribers.add(subscriber);
    this.kick();
    return {
      setActive: (active) => {
        subscriber.active = active;
      },
      unsubscribe: () => {
        this.subscribers.delete(subscriber);
      },
    };
  }

  /**
   * Silences the engine and stops the loop without tearing the graph down.
   * The context is suspended rather than closed because a media element can
   * never be attached to a second context, and effect cleanups also run when
   * the element survives (Fast Refresh, StrictMode).
   */
  suspend() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    void this.graph?.ctx.suspend();
  }

  resume() {
    if (!this.playing) return;
    void this.graph?.ctx.resume();
    this.kick();
  }

  private get playing() {
    return this.mediaPlaying || this.test !== null;
  }

  private applyTestGains() {
    if (!this.test) return;
    const [l, r] = PRESET_ROUTING[this.testPreset];
    this.test.gainL.gain.value = l * this.testAmplitude;
    this.test.gainR.gain.value = r * this.testAmplitude;
  }

  private applyVolume() {
    if (!this.graph) return;
    const trim = this.test ? TEST_HEARD_AMPLITUDE / this.testAmplitude : 1;
    this.graph.volume.gain.value = this.volumeLevel * trim;
  }

  private sourcesChanged() {
    if (this.playing) {
      void this.graph?.ctx.resume();
      this.kick();
    } else {
      this.tailUntil = performance.now() + TAIL_MS;
    }
  }

  private kick() {
    if (this.raf !== 0 || !this.playing || this.subscribers.size === 0) return;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    const graph = this.graph;
    if (!graph || this.subscribers.size === 0) {
      this.raf = 0;
      return;
    }
    if (!this.playing && now > this.tailUntil) {
      this.raf = 0;
      for (const subscriber of this.subscribers) subscriber.onIdle?.();
      return;
    }

    const dt = Math.min(Math.max(now - this.lastFrame, 0), MAX_DT_MS);
    this.lastFrame = now;

    let anyActive = false;
    for (const subscriber of this.subscribers) {
      if (subscriber.active) {
        anyActive = true;
        break;
      }
    }
    if (anyActive) {
      graph.analyserL.getFloatTimeDomainData(this.left);
      graph.analyserR.getFloatTimeDomainData(this.right);
      const fresh = Math.min(
        FFT_SIZE,
        Math.ceil((dt * graph.ctx.sampleRate) / 1000),
      );
      for (const subscriber of this.subscribers) {
        if (subscriber.active) {
          subscriber.onFrame(this.left, this.right, fresh, dt);
        }
      }
    }

    this.raf = requestAnimationFrame(this.tick);
  };
}
