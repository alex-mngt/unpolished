/** What a trigger does to the voices its input is already sounding. */
export type InputMode = "mono" | "poly";

/**
 * One sampler pad: a decoded sample that can be triggered at any time and
 * plays alongside every other input.
 */
export interface AudioInput {
  /**
   * Decodes an audio file and makes it the sample of this input. Rejects, and
   * keeps the previous sample, when the data cannot be decoded. Voices that are
   * already sounding play the old sample out.
   */
  load: (data: ArrayBuffer) => Promise<void>;
  /** Plays the sample from the top. Does nothing until a sample is loaded. */
  trigger: () => void;
  setGain: (level: number) => void;
  /** Takes effect on the next trigger: sounding voices are left alone. */
  setMode: (mode: InputMode) => void;
  /** Fades the input out and removes it from the engine. */
  dispose: () => void;
}

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
  mix: GainNode;
  volume: GainNode;
  analyserL: AnalyserNode;
  analyserR: AnalyserNode;
}

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface InputState {
  /** Created with the first voice, so that no input needs a user gesture. */
  node: GainNode | null;
  buffer: AudioBuffer | null;
  level: number;
  mode: InputMode;
  /** Oldest first. A voice leaves this list as soon as it starts fading out. */
  voices: Voice[];
  /** Voices still connected, including the ones fading out. */
  live: number;
  /** Bumped by every `load`, so that the latest request wins. */
  loads: number;
  disposed: boolean;
}

const FFT_SIZE = 2048;
// Keep ticking this long after the last voice ends so traces can fade out
// and needles can fall back to rest.
const TAIL_MS = 1500;
// Frame gaps longer than this (tab was hidden) are treated as this long.
const MAX_DT_MS = 100;
/** Voices one input can sound at once in poly mode; the oldest is stolen. */
export const MAX_VOICES = 8;
// Long enough that a voice cut mid-waveform does not click.
const CHOKE_FADE_S = 0.005;
// Time constant gain changes glide with, so dragging a slider does not zip.
const GAIN_GLIDE_S = 0.01;

// Trim applied to the sum (-3 dB); the limiter takes care of the rest.
const HEADROOM = Math.SQRT1_2;
// A soft knee that ends at full scale, so the limiter eases in instead of
// clamping. It is not a brick wall: a transient can still get past it during
// the attack.
const LIMITER_THRESHOLD_DB = -6;
const LIMITER_KNEE_DB = 6;
const LIMITER_RATIO = 8;
const LIMITER_ATTACK_S = 0.003;
const LIMITER_RELEASE_S = 0.25;

const glide = (gain: GainNode, level: number) =>
  gain.gain.setTargetAtTime(level, gain.context.currentTime, GAIN_GLIDE_S);

/**
 * One AudioContext, one stereo tap and one animation loop shared by every
 * visualizer. Lives outside React: nothing here triggers a render.
 *
 *   voice -> voice gain -+-> input gain -+-> mix (forced stereo, headroom) -> limiter -> splitter -> analyserL / analyserR
 *   voice -> voice gain -+               |                                           -> volume   -> speakers
 *                          input gain ---+
 *
 * The tap sits after the limiter and before the volume, so the visualizers
 * see every input at once, at the level that reaches the volume control. The
 * limiter keeps the sum near full scale, short transients aside.
 */
export class AudioEngine {
  private graph: Graph | null = null;
  private inputs = new Set<InputState>();
  private subscribers = new Set<Subscriber>();
  private left = new Float32Array(FFT_SIZE);
  private right = new Float32Array(FFT_SIZE);
  private liveVoices = 0;
  private volumeLevel = 1;
  private raf = 0;
  private lastFrame = 0;
  private tailUntil = 0;

  /** A context made outside a user gesture stays suspended until a trigger. */
  private ensureGraph(): Graph {
    if (this.graph) return this.graph;

    const ctx = new AudioContext();
    const mix = ctx.createGain();
    // Upmix mono samples so the right channel is not read as silence.
    mix.channelCount = 2;
    mix.channelCountMode = "explicit";
    mix.channelInterpretation = "speakers";
    mix.gain.value = HEADROOM;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = LIMITER_THRESHOLD_DB;
    limiter.knee.value = LIMITER_KNEE_DB;
    limiter.ratio.value = LIMITER_RATIO;
    limiter.attack.value = LIMITER_ATTACK_S;
    limiter.release.value = LIMITER_RELEASE_S;
    mix.connect(limiter);

    const splitter = ctx.createChannelSplitter(2);
    const analyserL = ctx.createAnalyser();
    const analyserR = ctx.createAnalyser();
    analyserL.fftSize = analyserR.fftSize = FFT_SIZE;
    limiter.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);

    const volume = ctx.createGain();
    volume.gain.value = this.volumeLevel;
    limiter.connect(volume);
    volume.connect(ctx.destination);

    this.graph = { ctx, mix, volume, analyserL, analyserR };
    return this.graph;
  }

  createInput(): AudioInput {
    const input: InputState = {
      node: null,
      buffer: null,
      level: 1,
      mode: "mono",
      voices: [],
      live: 0,
      loads: 0,
      disposed: false,
    };
    this.inputs.add(input);

    return {
      load: async (data) => {
        const request = ++input.loads;
        const buffer = await this.ensureGraph().ctx.decodeAudioData(data);
        if (request === input.loads && !input.disposed) input.buffer = buffer;
      },
      trigger: () => this.trigger(input),
      setGain: (level) => {
        input.level = level;
        if (input.node) glide(input.node, level);
      },
      setMode: (mode) => {
        input.mode = mode;
      },
      dispose: () => {
        input.disposed = true;
        input.buffer = null;
        this.inputs.delete(input);
        this.chokeAll(input);
        if (input.live === 0) input.node?.disconnect();
      },
    };
  }

  /** Fades out every voice of every input. */
  stopAll() {
    for (const input of this.inputs) this.chokeAll(input);
  }

  setVolume(level: number) {
    this.volumeLevel = level;
    if (this.graph) glide(this.graph.volume, level);
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
   * The context is suspended rather than closed because effect cleanups also
   * run when the engine survives (Fast Refresh, StrictMode).
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
    return this.liveVoices > 0;
  }

  /** Must be reached from a user gesture (browser autoplay policy). */
  private trigger(input: InputState) {
    if (!input.buffer || input.disposed) return;
    const { ctx, mix } = this.ensureGraph();
    if (!input.node) {
      input.node = ctx.createGain();
      input.node.gain.value = input.level;
      input.node.connect(mix);
    }

    if (input.mode === "mono") this.chokeAll(input);
    else if (input.voices.length >= MAX_VOICES) {
      this.choke(input, input.voices[0]);
    }

    const source = ctx.createBufferSource();
    source.buffer = input.buffer;
    const gain = ctx.createGain();
    source.connect(gain).connect(input.node);
    const voice: Voice = { source, gain };
    source.onended = () => {
      const index = input.voices.indexOf(voice);
      if (index !== -1) input.voices.splice(index, 1);
      gain.disconnect();
      input.live--;
      if (input.disposed && input.live === 0) input.node?.disconnect();
      this.liveVoices--;
      this.sourcesChanged();
    };
    source.start();
    input.voices.push(voice);
    input.live++;
    this.liveVoices++;
    this.sourcesChanged();
  }

  private chokeAll(input: InputState) {
    while (input.voices.length > 0) this.choke(input, input.voices[0]);
  }

  /** Fades a voice out; its `onended` then releases it. */
  private choke(input: InputState, voice: Voice) {
    input.voices.splice(input.voices.indexOf(voice), 1);
    const { gain, source } = voice;
    const now = source.context.currentTime;
    gain.gain.setValueAtTime(1, now);
    gain.gain.linearRampToValueAtTime(0, now + CHOKE_FADE_S);
    source.stop(now + CHOKE_FADE_S);
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
