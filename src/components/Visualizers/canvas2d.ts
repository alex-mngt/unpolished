// Shared by every visualizer's drawing code. Kept free of DOM and React access
// so that code can still move to an OffscreenCanvas worker unchanged.

export type Context2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export const FONT_FAMILY = "ui-monospace, Menlo, monospace";
