"use client";

import { cn } from "cn";
import { FC, useEffect, useRef } from "react";

import { useAudioEngine } from "@/lib/audio/context";

import { mountCanvasLayers } from "../canvasLayers";
import { advanceNeedle, createNeedle, resetNeedle } from "./ballistics";
import { drawFace, drawNeedle } from "./draw";

type Channel = "left" | "right";

const LABELS: Record<Channel, string> = { left: "L", right: "R" };

interface VUMeterProps {
  channel: Channel;
  /** Peak level of the sine that reads 0 VU. */
  referenceDbfs?: number;
  className?: string;
}

export const VUMeter: FC<VUMeterProps> = ({
  channel,
  referenceDbfs = -18,
  className,
}) => {
  const engine = useAudioEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLCanvasElement>(null);
  const needleRef = useRef<HTMLCanvasElement>(null);

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
    const paint = () => drawNeedle(needleCtx, width, height, needle.position);

    return mountCanvasLayers({
      engine,
      container,
      canvases: [face, needleCanvas],
      onLayout: (nextWidth, nextHeight) => {
        width = nextWidth;
        height = nextHeight;
        const style = getComputedStyle(container);
        const red = style.getPropertyValue("--danger").trim() || style.color;
        drawFace(faceCtx, width, height, style.color, red, LABELS[channel]);
        needleCtx.strokeStyle = style.color;
        // No frames arrive while idle, so the needle is repainted here too.
        paint();
      },
      onFrame: (left, right, fresh, dtMs) => {
        const samples = channel === "left" ? left : right;
        advanceNeedle(needle, samples, fresh, dtMs, referenceDbfs);
        paint();
      },
      onIdle: () => {
        resetNeedle(needle);
        paint();
      },
    });
  }, [engine, channel, referenceDbfs]);

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
