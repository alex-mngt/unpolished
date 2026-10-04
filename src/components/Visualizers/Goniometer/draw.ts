// Pure drawing code: no DOM or React access beyond the 2D context it is given,
// so it can move to an OffscreenCanvas worker unchanged.
// Both functions expect the context to be scaled so that 1 unit = 1 CSS pixel.

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Dot edge length in CSS pixels. */
export const DOT_SIZE = 1.5;
/** Time constant of the fade: the trace is at ~5% after three of these. */
export const FADE_TIME_MS = 100;
/** Space kept around the full-scale diamond for the axis letters. */
export const PADDING = 14;
export const GRID_ALPHA = 0.3;
export const LABEL_FONT = "10px ui-monospace, Menlo, monospace";

// Distance in pixels from the centre to a diamond vertex (L = R = 1).
const halfExtent = (size: number) => size / 2 - PADDING;

export const drawGrid = (ctx: Context2D, size: number, color: string) => {
  ctx.clearRect(0, 0, size, size);
  const half = halfExtent(size);
  if (half <= 0) return;
  const c = size / 2;
  const k = half / 2;

  ctx.globalAlpha = GRID_ALPHA;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Mid (vertical) and side (horizontal) axes.
  ctx.moveTo(c, c - half);
  ctx.lineTo(c, c + half);
  ctx.moveTo(c - half, c);
  ctx.lineTo(c + half, c);
  // Left channel axis (to the top left) and right channel axis (top right).
  ctx.moveTo(c - k, c - k);
  ctx.lineTo(c + k, c + k);
  ctx.moveTo(c + k, c - k);
  ctx.lineTo(c - k, c + k);
  // Full scale: the square |L|, |R| <= 1 seen after the 45° rotation.
  ctx.moveTo(c, c - half);
  ctx.lineTo(c + half, c);
  ctx.lineTo(c, c + half);
  ctx.lineTo(c - half, c);
  ctx.closePath();
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.font = LABEL_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("M", c, c - half - 7);
  ctx.fillText("S", c + half + 7, c);
  ctx.fillText("L", c - k - 8, c - k - 8);
  ctx.fillText("R", c + k + 8, c - k - 8);
};

/**
 * Fades the existing trace, then plots the newest `fresh` samples as dots at
 *   x = (R − L) / √2,  y = (L + R) / √2
 * scaled so that the full-scale diamond touches the padded canvas edge.
 * Expects `ctx.fillStyle` to be the trace colour.
 */
export const drawTrace = (
  ctx: Context2D,
  size: number,
  left: Float32Array,
  right: Float32Array,
  fresh: number,
  dtMs: number,
) => {
  const half = halfExtent(size);
  if (half <= 0) return;

  // Time-based so the decay looks the same at 60 Hz and 120 Hz.
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 1 - Math.exp(-dtMs / FADE_TIME_MS);
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  // The 1/√2 of the rotation is folded into the pixel scale.
  const k = half / 2;
  const origin = size / 2 - DOT_SIZE / 2;
  ctx.beginPath();
  for (let i = left.length - fresh; i < left.length; i++) {
    const l = left[i];
    const r = right[i];
    ctx.rect(origin + (r - l) * k, origin - (l + r) * k, DOT_SIZE, DOT_SIZE);
  }
  ctx.fill();
};
