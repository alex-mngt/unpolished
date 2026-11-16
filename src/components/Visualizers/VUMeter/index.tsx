"use client";

import { cn } from "cn";
import { FC, useEffect, useRef } from "react";

import { useAudioEngine } from "@/lib/audio/context";

import { mountCanvasLayers } from "../canvasLayers";
import { advanceNeedle, createNeedle, resetNeedle } from "./ballistics";
import type { VUMeterConfig } from "./config";
import { drawFace, drawNeedle } from "./draw";

type Channel = "left" | "right";

const LABELS: Record<Channel, string> = { left: "L", right: "R" };

interface VUMeterProps {
  channel: Channel;
  config: VUMeterConfig;
  className?: string;
}

export const VUMeter: FC<VUMeterProps> = ({ channel, config, className }) => {
  const engine = useAudioEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLCanvasElement>(null);
  const needleRef = useRef<HTMLCanvasElement>(null);
  // Read per frame rather than closed over, so a config change does not
  // remount the layers and snap the needle back to rest.
  const configRef = useRef(config);
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    const face = faceRef.current;
    const needleCanvas = needleRef.current;
    const faceCtx = face?.getContext("2d");
    const needleCtx = needleCanvas?.getContext("2d");
    if (!container || !face || !needleCanvas || !faceCtx || !needleCtx) return;

    const needle = createNeedle();
    let width = 0;
    let height = 0;
    const paint = () =>
      drawNeedle(needleCtx, width, height, needle.position, configRef.current);

    const layers = mountCanvasLayers({
      engine,
      container,
      canvases: [face, needleCanvas],
      onLayout: (nextWidth, nextHeight) => {
        width = nextWidth;
        height = nextHeight;
        const style = getComputedStyle(container);
        const red = style.getPropertyValue("--danger").trim() || style.color;
        drawFace(
          faceCtx,
          width,
          height,
          style.color,
          red,
          LABELS[channel],
          configRef.current,
        );
        needleCtx.strokeStyle = style.color;
        // No frames arrive while idle, so the needle is repainted here too.
        paint();
      },
      onFrame: (left, right, fresh, dtMs) => {
        const samples = channel === "left" ? left : right;
        advanceNeedle(needle, samples, fresh, dtMs, configRef.current);
        paint();
      },
      onIdle: () => {
        resetNeedle(needle);
        paint();
      },
    });
    redrawRef.current = layers.redraw;
    return () => {
      layers.unmount();
      redrawRef.current = () => {};
    };
  }, [engine, channel]);

  useEffect(() => {
    configRef.current = config;
    // The face is static: it is only redrawn when its inputs change.
    redrawRef.current();
  }, [config]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`VU meter, ${channel} channel`}
      className={cn("relative aspect-5/2 text-foreground", className)}
    >
      <canvas ref={faceRef} className="absolute inset-0 size-full" />
      <canvas ref={needleRef} className="absolute inset-0 size-full" />
    </div>
  );
};
