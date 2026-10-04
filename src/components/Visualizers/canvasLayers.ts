import type { AudioEngine, FrameCallback } from "@/lib/audio/engine";

const MAX_PIXEL_RATIO = 2;

interface CanvasLayersOptions {
  engine: AudioEngine;
  /** Sized by CSS; every canvas is stretched over it. */
  container: HTMLElement;
  canvases: HTMLCanvasElement[];
  /**
   * Called with the container size in CSS pixels whenever the canvases have
   * been resized, and when the colour scheme changes. Resizing a canvas clears
   * it, so static layers are redrawn here and only here. Every 2D context is
   * already scaled so that 1 unit = 1 CSS pixel.
   */
  onLayout: (width: number, height: number) => void;
  onFrame: FrameCallback;
  onIdle?: () => void;
}

/**
 * The plumbing every canvas visualizer needs: keeps the canvases sized to
 * their container and the display's pixel ratio, and subscribes to the engine
 * only while the container is on screen. Call it from an effect and return
 * its result as the cleanup.
 */
export const mountCanvasLayers = ({
  engine,
  container,
  canvases,
  onLayout,
  onFrame,
  onIdle,
}: CanvasLayersOptions): (() => void) => {
  const layout = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const width = container.clientWidth;
    const height = container.clientHeight;
    for (const canvas of canvases) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    onLayout(width, height);
  };

  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(container);
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  scheme.addEventListener("change", layout);

  // Moving between displays or zooming changes the pixel ratio without
  // resizing the container, so it needs its own watcher.
  let ratioQuery: MediaQueryList;
  const onRatioChange = () => {
    layout();
    watchRatio();
  };
  const watchRatio = () => {
    ratioQuery = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`,
    );
    ratioQuery.addEventListener("change", onRatioChange, { once: true });
  };
  watchRatio();

  const subscription = engine.subscribe(onFrame, onIdle);

  // Several changes can arrive in one delivery; the last one is current.
  const intersectionObserver = new IntersectionObserver((entries) =>
    subscription.setActive(entries[entries.length - 1].isIntersecting),
  );
  intersectionObserver.observe(container);

  return () => {
    subscription.unsubscribe();
    intersectionObserver.disconnect();
    resizeObserver.disconnect();
    scheme.removeEventListener("change", layout);
    ratioQuery.removeEventListener("change", onRatioChange);
  };
};
