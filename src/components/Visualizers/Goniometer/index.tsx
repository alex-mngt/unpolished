"use client";

import { cn } from "cn";
import { FC, useEffect, useRef } from "react";

import { useAudioEngine } from "@/lib/audio/context";

import { drawGrid, drawTrace } from "./draw";

const MAX_PIXEL_RATIO = 2;

interface GoniometerProps {
  className?: string;
}

export const Goniometer: FC<GoniometerProps> = ({ className }) => {
  const engine = useAudioEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const traceRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    const trace = traceRef.current;
    const gridCtx = grid?.getContext("2d");
    const traceCtx = trace?.getContext("2d");
    if (!container || !grid || !trace || !gridCtx || !traceCtx) return;

    let size = 0;

    // Resizing a canvas clears it, so the static grid is redrawn here and only here.
    const layout = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      size = container.clientWidth;
      const pixels = Math.round(size * ratio);
      const color = getComputedStyle(container).color;
      for (const [canvas, ctx] of [
        [grid, gridCtx],
        [trace, traceCtx],
      ] as const) {
        canvas.width = canvas.height = pixels;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      drawGrid(gridCtx, size, color);
      traceCtx.fillStyle = color;
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

    const subscription = engine.subscribe(
      (left, right, fresh, dtMs) =>
        drawTrace(traceCtx, size, left, right, fresh, dtMs),
      () => traceCtx.clearRect(0, 0, size, size),
    );

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
  }, [engine]);

  return (
    <div
      ref={containerRef}
      className={cn("relative aspect-square text-foreground", className)}
    >
      <canvas ref={gridRef} className="absolute inset-0 size-full" />
      <canvas ref={traceRef} className="absolute inset-0 size-full" />
    </div>
  );
};
