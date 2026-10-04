"use client";

import { cn } from "cn";
import { FC, useEffect, useRef } from "react";

import { useAudioEngine } from "@/lib/audio/context";

import { mountCanvasLayers } from "../canvasLayers";
import { drawGrid, drawTrace } from "./draw";

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

    return mountCanvasLayers({
      engine,
      container,
      canvases: [grid, trace],
      onLayout: (width) => {
        size = width;
        const color = getComputedStyle(container).color;
        drawGrid(gridCtx, size, color);
        traceCtx.fillStyle = color;
      },
      onFrame: (left, right, fresh, dtMs) =>
        drawTrace(traceCtx, size, left, right, fresh, dtMs),
      onIdle: () => traceCtx.clearRect(0, 0, size, size),
    });
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
