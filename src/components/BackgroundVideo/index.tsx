"use client";

import type { MuxBackgroundVideo } from "@videojs/react/media/mux-background-video";
import { cn } from "cn";
import dynamic from "next/dynamic";
import { ComponentProps, FC } from "react";

// Client-only: the engine probes MediaSource, which doesn't exist on the server.
const Video = dynamic(
  () =>
    import("@videojs/react/media/mux-background-video").then(
      (m) => m.MuxBackgroundVideo,
    ),
  { ssr: false },
);

interface BackgroundVideoProps
  extends ComponentProps<typeof MuxBackgroundVideo> {}

export const BackgroundVideo: FC<BackgroundVideoProps> = ({
  className,
  ...props
}) => {
  return (
    <div className={cn(className)}>
      <Video {...props} className="size-full object-cover" />
    </div>
  );
};
