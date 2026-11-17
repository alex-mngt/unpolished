// Pure drawing code: no DOM or React access beyond the 2D context it is given,
// so it can move to an OffscreenCanvas worker unchanged.
// Both functions expect the context to be scaled so that 1 unit = 1 CSS pixel.

import { type Context2D, FONT_FAMILY } from "../canvas2d";
import { vuToPosition } from "./ballistics";

export interface FaceConfig {
  /** Angle in degrees between the vertical and either end of the scale. */
  halfSweepDeg: number;
}

/** Marks on the scale, in VU. The ones above 0 are drawn in red. */
export const MARKS = [-20, -10, -7, -5, -3, -2, -1, 0, 1, 2, 3];

const SCALE_END = vuToPosition(MARKS[MARKS.length - 1]);

const halfSweepOf = ({ halfSweepDeg }: FaceConfig) =>
  (halfSweepDeg * Math.PI) / 180;

// The pivot sits below the visible window, as on a real meter, which flattens
// the arc. Everything is proportional to the width of the face, and the arc is
// pushed up until its labels touch the top edge.
const geometry = (width: number, halfSweep: number) => {
  const radius = width * 0.55;
  const tick = width * 0.027;
  const font = Math.max(9, width * 0.033);
  const top = tick + font * 1.9;
  return {
    cx: width / 2,
    cy: top + radius,
    radius,
    tick,
    font,
    halfSweep,
    // Just under the ends of the scale.
    legend: top + radius * (1 - Math.cos(halfSweep)) + font * 1.8,
  };
};

// Clockwise from the vertical; linear in voltage, which is what crowds the
// low marks to the left and spreads -3 to +3 over the right half.
const angleOf = (position: number, halfSweep: number) =>
  halfSweep * ((2 * position) / SCALE_END - 1);

// Canvas arcs measure their angles clockwise from the x axis.
const arc = (
  ctx: Context2D,
  { cx, cy, radius, halfSweep }: ReturnType<typeof geometry>,
  from: number,
  to: number,
) => {
  ctx.beginPath();
  ctx.arc(
    cx,
    cy,
    radius,
    angleOf(from, halfSweep) - Math.PI / 2,
    angleOf(to, halfSweep) - Math.PI / 2,
  );
  ctx.stroke();
};

export const drawFace = (
  ctx: Context2D,
  width: number,
  height: number,
  color: string,
  red: string,
  label: string,
  config: FaceConfig,
) => {
  ctx.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0) return;
  const g = geometry(width, halfSweepOf(config));

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  arc(ctx, g, vuToPosition(MARKS[0]), 1);
  ctx.strokeStyle = red;
  ctx.lineWidth = 3;
  arc(ctx, g, 1, SCALE_END);

  ctx.lineWidth = 1;
  ctx.font = `${g.font}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const vu of MARKS) {
    const angle = angleOf(vuToPosition(vu), g.halfSweep);
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const outer = g.radius + g.tick;
    const text = outer + g.font * 0.9;
    ctx.strokeStyle = ctx.fillStyle = vu > 0 ? red : color;
    ctx.beginPath();
    ctx.moveTo(g.cx + g.radius * sin, g.cy - g.radius * cos);
    ctx.lineTo(g.cx + outer * sin, g.cy - outer * cos);
    ctx.stroke();
    ctx.fillText(String(Math.abs(vu)), g.cx + text * sin, g.cy - text * cos);
  }

  ctx.fillStyle = color;
  ctx.font = `bold ${g.font * 1.4}px ${FONT_FAMILY}`;
  ctx.fillText("VU", g.cx, g.legend);
  ctx.font = `${g.font}px ${FONT_FAMILY}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, 0, height - g.font * 0.4);
};

/** Expects `ctx.strokeStyle` to be the needle colour. */
export const drawNeedle = (
  ctx: Context2D,
  width: number,
  height: number,
  position: number,
  config: FaceConfig,
) => {
  ctx.clearRect(0, 0, width, height);
  if (width <= 0 || height <= 0) return;
  const g = geometry(width, halfSweepOf(config));
  const angle = angleOf(position, g.halfSweep);
  const length = g.radius + g.tick;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(g.cx, g.cy);
  ctx.lineTo(g.cx + length * Math.sin(angle), g.cy - length * Math.cos(angle));
  ctx.stroke();
};
