"use client";

import { Button } from "@/components/shadcn/button";
import { Field, FieldLabel } from "@/components/shadcn/field";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { Slider } from "@/components/shadcn/slider";
import { OptionSelect } from "@/components/UI/Select";
import { AudioInput, InputMode } from "@/lib/audio/engine";
import { Settings2 } from "lucide-react";
import { ChangeEvent, FC, useId } from "react";

import { PadForm } from "../../form";

const MODES: { value: InputMode; label: string }[] = [
  { value: "mono", label: "Mono" },
  { value: "poly", label: "Poly" },
];

interface PadSettingsProps {
  input: AudioInput;
  form: PadForm;
  /** Upper-cased pad shortcut, for labels. */
  shortcut: string;
  onSelectFile: (event: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

/** Gear button opening a popover with the pad's file, gain and mode. */
export const PadSettings: FC<PadSettingsProps> = ({
  input,
  form,
  shortcut,
  onSelectFile,
  className,
}) => {
  const id = useId();
  const gainLabelId = `${id}-gain-label`;
  const modeId = `${id}-mode`;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Settings for pad ${shortcut}`}
            className={className}
          />
        }
      >
        <Settings2 />
      </PopoverTrigger>
      <PopoverContent align="end">
        <PopoverHeader>
          <PopoverTitle>Pad {shortcut} settings</PopoverTitle>
        </PopoverHeader>
        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-col gap-3"
        >
          <input
            type="file"
            accept="audio/*"
            aria-label={`Audio file for pad ${shortcut}`}
            onChange={onSelectFile}
            className="w-full"
          />
          <form.Field
            name="gain"
            listeners={{ onChange: ({ value }) => input.setGain(value) }}
          >
            {(field) => (
              <Field orientation="horizontal">
                <FieldLabel id={gainLabelId} className="flex-none!">
                  Gain
                </FieldLabel>
                <Slider
                  aria-labelledby={gainLabelId}
                  min={0}
                  max={1}
                  step={0.01}
                  value={[field.state.value]}
                  // The wrapper's types lose the single-thumb shape.
                  onValueChange={(value) =>
                    field.handleChange(Array.isArray(value) ? value[0] : value)
                  }
                  className="flex-1 min-w-0"
                />
              </Field>
            )}
          </form.Field>
          <form.Field
            name="mode"
            listeners={{ onChange: ({ value }) => input.setMode(value) }}
          >
            {(field) => (
              <Field orientation="horizontal">
                <FieldLabel htmlFor={modeId} className="flex-none!">
                  Mode
                </FieldLabel>
                <OptionSelect
                  id={modeId}
                  name={field.name}
                  items={MODES}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  className="flex-1"
                />
              </Field>
            )}
          </form.Field>
        </form>
      </PopoverContent>
    </Popover>
  );
};
