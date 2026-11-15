"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { Info } from "lucide-react";
import { FC } from "react";

interface FieldHintProps {
  /** Ties the hint to its control: put the same id in `aria-describedby`. */
  id: string;
  /** Field title, so the icon reads as "About Attack" to a screen reader. */
  title: string;
  /** What changing the field does to the experience. */
  description: string;
  /** Optional second line, e.g. "Range: −24 to 0 dB". */
  range?: string;
}

/**
 * Info icon that explains a form control. Sighted users get a tooltip on
 * hover or focus; the text also sits hidden in the DOM under `id`, so the
 * control it describes can point at it with `aria-describedby`.
 */
export const FieldHint: FC<FieldHintProps> = ({
  id,
  title,
  description,
  range,
}) => (
  <>
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label={`About ${title}`}
              className="inline-flex items-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          }
        >
          <Info className="size-3.5" aria-hidden />
        </TooltipTrigger>
        <TooltipContent side="left" className="flex-col items-start gap-1">
          <p>{description}</p>
          {range && <p className="text-background/70">{range}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <span id={id} className="sr-only">
      {description}
      {range && ` ${range}`}
    </span>
  </>
);

/** "Range: −24 to 0 dB", with a real minus sign and the unit said once. */
export const formatRange = (min: number, max: number, unit?: string) => {
  const num = (n: number) => String(n).replace("-", "−");
  return `Range: ${num(min)} to ${num(max)}${unit ? ` ${unit}` : ""}`;
};
