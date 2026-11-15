"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cn } from "cn";
import { XIcon } from "lucide-react";
import { FC } from "react";

import { Button } from "@/components/shadcn/button";

type SheetPanelProps = SheetPrimitive.Popup.Props & {
  side?: "right" | "left";
};

/**
 * The panel of a non-modal sheet. shadcn's `SheetContent` always mounts a
 * full-screen backdrop, which dims the page and swallows every click outside
 * the sheet even when `modal` is false. This is the same popup without it,
 * so the page behind stays usable. Its classes mirror `shadcn/sheet`: re-copy
 * them when that file is regenerated.
 */
export const SheetPanel: FC<SheetPanelProps> = ({
  className,
  children,
  side = "right",
  ...props
}) => (
  <SheetPrimitive.Portal data-slot="sheet-portal">
    <SheetPrimitive.Popup
      data-slot="sheet-content"
      data-side={side}
      className={cn(
        "fixed inset-y-0 z-50 flex h-full w-3/4 flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 sm:max-w-sm",
        side === "right"
          ? "right-0 border-l data-ending-style:translate-x-[2.5rem] data-starting-style:translate-x-[2.5rem]"
          : "left-0 border-r data-ending-style:translate-x-[-2.5rem] data-starting-style:translate-x-[-2.5rem]",
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close
        data-slot="sheet-close"
        render={
          <Button
            variant="ghost"
            className="absolute top-3 right-3"
            size="icon-sm"
          />
        }
      >
        <XIcon />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Popup>
  </SheetPrimitive.Portal>
);
