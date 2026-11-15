import { DEFAULT_ENGINE_CONFIG, type EngineConfig } from "./config";
import { dbToGain } from "./db";

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
  limiter: DynamicsCompressorNode;
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

// Frame gaps longer than this (tab was hidden) are treated as this long.
const MAX_DT_MS = 100;

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
 *
 * Every number in `EngineConfig` can be changed while playing: see
 * `configure`.
 */
export class AudioEngine {
  private graph: Graph | null = null;
  private config: EngineConfig;
  private inputs = new Set<InputState>();
  private subscribers = new Set<Subscriber>();
  private left: Float32Array<ArrayBuffer>;
  private right: Float32Array<ArrayBuffer>;
  private liveVoices = 0;
  private volumeLevel = 1;
  private raf = 0;
  private lastFrame = 0;
  private tailUntil = 0;

  constructor(config: EngineConfig = DEFAULT_ENGINE_CONFIG) {
    this.config = config;
    this.left = new Float32Array(config.fftSize);
    this.right = new Float32Array(config.fftSize);
  }

  /**
   * Applies a new configuration, to the live graph too. Voice and loop
   * settings are read when they are next needed; node parameters are set
   * right away, gains gliding so nothing zips.
   */
  configure(config: EngineConfig) {
    this.config = config;
    if (this.left.length !== config.fftSize) {
      this.left = new Float32Array(config.fftSize);
      this.right = new Float32Array(config.fftSize);
    }
    const graph = this.graph;
    if (!graph) return;
    this.glide(graph.mix, dbToGain(config.headroomDb));
    this.setLimiter(graph.limiter, config);
    graph.analyserL.fftSize = graph.analyserR.fftSize = config.fftSize;
  }

  private setLimiter(limiter: DynamicsCompressorNode, config: EngineConfig) {
    limiter.threshold.value = config.limiterThresholdDb;
    limiter.knee.value = config.limiterKneeDb;
    limiter.ratio.value = config.limiterRatio;
    limiter.attack.value = config.limiterAttackMs / 1000;
    limiter.release.value = config.limiterReleaseMs / 1000;
  }

  private glide(gain: GainNode, level: number) {
    gain.gain.setTargetAtTime(
      level,
      gain.context.currentTime,
      this.config.gainGlideMs / 1000,
    );
  }

  /** A context made outside a user gesture stays suspended until a trigger. */
  private ensureGraph(): Graph {
    if (this.graph) return this.graph;
    const { config } = this;

    const ctx = new AudioContext();
    const mix = ctx.createGain();
    // Upmix mono samples so the right channel is not read as silence.
    mix.channelCount = 2;
    mix.channelCountMode = "explicit";
    mix.channelInterpretation = "speakers";
    mix.gain.value = dbToGain(config.headroomDb);

    const limiter = ctx.createDynamicsCompressor();
    this.setLimiter(limiter, config);
    mix.connect(limiter);

    const splitter = ctx.createChannelSplitter(2);
    const analyserL = ctx.createAnalyser();
    const analyserR = ctx.createAnalyser();
    analyserL.fftSize = analyserR.fftSize = config.fftSize;
    limiter.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);

    const volume = ctx.createGain();
    volume.gain.value = this.volumeLevel;
    limiter.connect(volume);
    volume.connect(ctx.destination);

    this.graph = { ctx, mix, limiter, volume, analyserL, analyserR };
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
        if (input.node) this.glide(input.node, level);
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
    if (this.graph) this.glide(this.graph.volume, level);
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
    else if (input.voices.length >= this.config.maxVoices) {
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
    const end = now + this.config.chokeFadeMs / 1000;
    gain.gain.setValueAtTime(1, now);
    gain.gain.linearRampToValueAtTime(0, end);
    source.stop(end);
  }

  private sourcesChanged() {
    if (this.playing) {
      void this.graph?.ctx.resume();
      this.kick();
    } else {
      this.tailUntil = performance.now() + this.config.tailMs;
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
        this.left.length,
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
