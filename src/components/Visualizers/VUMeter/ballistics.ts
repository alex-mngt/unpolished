// Pure VU ballistics: no DOM, no React, no allocation per frame.
//
// The needle is a damped mass on a spring (a second-order low-pass) driven by
// the full-wave rectified average of the signal, like the moving coil and
// rectifier of a real meter. Its position is a voltage ratio: 0 is the rest
// position, 1 is 0 VU, and the dial angle is linear in it.

export interface NeedleState {
  position: number;
  velocity: number;
}

/** The right-hand mechanical stop, about +3.5 VU. The left one is 0. */
export const MAX_POSITION = 1.5;

// A step must reach 99% in 300 ms and overshoot by 1 to 1.5%. The overshoot
// depends only on the damping ratio (exp(-πζ / √(1 − ζ²)), about 1.3% here),
// and the step response of that system first crosses 99% at ω·t ≈ 4.
const DAMPING = 0.81;
const OMEGA = 4.08 / 0.3;

/** Longest integration step, so the motion does not depend on frame rate. */
const MAX_STEP_MS = 1;

// The rectified average of a sine of amplitude A is 2A / π.
const SINE_AVERAGE = 2 / Math.PI;

export const createNeedle = (): NeedleState => ({ position: 0, velocity: 0 });

export const resetNeedle = (needle: NeedleState) => {
  needle.position = 0;
  needle.velocity = 0;
};

export const positionToVu = (position: number) => 20 * Math.log10(position);

export const vuToPosition = (vu: number) => 10 ** (vu / 20);

/**
 * Moves the needle forward by `dtMs`, driven by the newest `fresh` samples,
 * and returns its new position. A sine at `referenceDbfs` settles on 0 VU.
 */
export const advanceNeedle = (
  needle: NeedleState,
  samples: Float32Array,
  fresh: number,
  dtMs: number,
  referenceDbfs: number,
): number => {
  let sum = 0;
  for (let i = samples.length - fresh; i < samples.length; i++) {
    sum += Math.abs(samples[i]);
  }
  const reference = SINE_AVERAGE * 10 ** (referenceDbfs / 20);
  const target = fresh > 0 ? sum / fresh / reference : 0;

  const steps = Math.ceil(dtMs / MAX_STEP_MS);
  const h = dtMs / steps / 1000;
  let { position, velocity } = needle;
  for (let i = 0; i < steps; i++) {
    velocity +=
      h * OMEGA * (OMEGA * (target - position) - 2 * DAMPING * velocity);
    position += h * velocity;
    // The stops are inelastic: the needle lands on them and stays.
    if (position > MAX_POSITION) {
      position = MAX_POSITION;
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
