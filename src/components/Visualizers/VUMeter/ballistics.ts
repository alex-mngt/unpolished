// Pure VU ballistics: no DOM, no React, no allocation per frame.
//
// The needle is a damped mass on a spring (a second-order low-pass) driven by
// the full-wave rectified average of the signal, like the moving coil and
// rectifier of a real meter. Its position is a voltage ratio: 0 is the rest
// position, 1 is 0 VU, and the dial angle is linear in it.

import { dbToGain, gainToDb } from "@/lib/audio/db";

export interface NeedleState {
  position: number;
  velocity: number;
}

export interface NeedleConfig {
  /** Peak level of the sine that reads 0 VU. */
  referenceDbfs: number;
  /** Damping ratio ζ; the overshoot is exp(-πζ / √(1 − ζ²)). */
  damping: number;
  /** Time a step takes to first reach 99%. */
  settleMs: number;
  /** The right-hand mechanical stop, as a voltage ratio. The left one is 0. */
  maxPosition: number;
}

/** Step response of a unit second-order system at ω·t = tau, for ζ = damping. */
const stepResponse = (damping: number, tau: number) => {
  if (damping < 1) {
    const wd = Math.sqrt(1 - damping ** 2);
    return (
      1 -
      Math.exp(-damping * tau) *
        (Math.cos(wd * tau) + (damping / wd) * Math.sin(wd * tau))
    );
  }
  if (damping === 1) return 1 - Math.exp(-tau) * (1 + tau);
  const root = Math.sqrt(damping ** 2 - 1);
  const s1 = -damping + root;
  const s2 = -damping - root;
  return 1 - (s2 * Math.exp(s1 * tau) - s1 * Math.exp(s2 * tau)) / (s2 - s1);
};

const SETTLED = 0.99;

/**
 * ω·t at which a step first reaches 99%, so that a settle time can be turned
 * into ω whatever the damping. Underdamped, that is before the first peak
 * (which always overshoots 99%); otherwise the response is monotonic.
 */
const settleTau = (damping: number) => {
  let high = damping < 1 ? Math.PI / Math.sqrt(1 - damping ** 2) : 1;
  while (damping >= 1 && stepResponse(damping, high) < SETTLED) high *= 2;
  let low = 0;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (stepResponse(damping, mid) < SETTLED) low = mid;
    else high = mid;
  }
  return high;
};

// The damping rarely changes, and the solve is too slow for every frame.
let settleCache = { damping: NaN, tau: 0 };
const settleTauCached = (damping: number) => {
  if (settleCache.damping !== damping) {
    settleCache = { damping, tau: settleTau(damping) };
  }
  return settleCache.tau;
};

/** Longest integration step, so the motion does not depend on frame rate. */
const MAX_STEP_MS = 1;

// The rectified average of a sine of amplitude A is 2A / π.
const SINE_AVERAGE = 2 / Math.PI;

export const createNeedle = (): NeedleState => ({ position: 0, velocity: 0 });

export const resetNeedle = (needle: NeedleState) => {
  needle.position = 0;
  needle.velocity = 0;
};

export const positionToVu = gainToDb;

export const vuToPosition = dbToGain;

/**
 * Moves the needle forward by `dtMs`, driven by the newest `fresh` samples,
 * and returns its new position. A sine at `referenceDbfs` settles on 0 VU.
 */
export const advanceNeedle = (
  needle: NeedleState,
  samples: Float32Array,
  fresh: number,
  dtMs: number,
  { referenceDbfs, damping, settleMs, maxPosition }: NeedleConfig,
): number => {
  let sum = 0;
  for (let i = samples.length - fresh; i < samples.length; i++) {
    sum += Math.abs(samples[i]);
  }
  const reference = SINE_AVERAGE * dbToGain(referenceDbfs);
  const target = fresh > 0 ? sum / fresh / reference : 0;
  const omega = settleTauCached(damping) / (settleMs / 1000);

  const steps = Math.ceil(dtMs / MAX_STEP_MS);
  const h = dtMs / steps / 1000;
  let { position, velocity } = needle;
  for (let i = 0; i < steps; i++) {
    velocity +=
      h * omega * (omega * (target - position) - 2 * damping * velocity);
    position += h * velocity;
    // The stops are inelastic: the needle lands on them and stays.
    if (position > maxPosition) {
      position = maxPosition;
      velocity = 0;
    } else if (position < 0) {
      position = 0;
      velocity = 0;
    }
  }
  needle.position = position;
  needle.velocity = velocity;
  return position;
};
