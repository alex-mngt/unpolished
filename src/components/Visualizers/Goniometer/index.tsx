"use client";

import { cn } from "cn";
import { FC, useEffect, useRef } from "react";

import { useAudioEngine } from "@/lib/audio/context";

import { mountCanvasLayers } from "../canvasLayers";
import type { GoniometerConfig } from "./config";
import { drawGrid, drawTrace } from "./draw";

interface GoniometerProps {
  config: GoniometerConfig;
  className?: string;
}

export const Goniometer: FC<GoniometerProps> = ({ config, className }) => {
  const engine = useAudioEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const traceRef = useRef<HTMLCanvasElement>(null);
  // Read per frame rather than closed over, so a config change does not
  // remount the layers and wipe the trace.
  const configRef = useRef(config);
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    const trace = traceRef.current;
    const gridCtx = grid?.getContext("2d");
    const traceCtx = trace?.getContext("2d");
    if (!container || !grid || !trace || !gridCtx || !traceCtx) return;

    let size = 0;
    const layers = mountCanvasLayers({
      engine,
      container,
      canvases: [grid, trace],
      onLayout: (width) => {
        size = width;
        const color = getComputedStyle(container).color;
        drawGrid(gridCtx, size, color, configRef.current);
        traceCtx.fillStyle = color;
      },
      onFrame: (left, right, fresh, dtMs) =>
        drawTrace(traceCtx, size, left, right, fresh, dtMs, configRef.current),
      onIdle: () => traceCtx.clearRect(0, 0, size, size),
    });
    redrawRef.current = layers.redraw;
    return () => {
      layers.unmount();
      redrawRef.current = () => {};
    };
  }, [engine]);

  useEffect(() => {
    configRef.current = config;
    // The grid is static: it is only redrawn when its inputs change.
    redrawRef.current();
  }, [config]);

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
