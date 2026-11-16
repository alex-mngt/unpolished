"use client";

import { Button } from "@/components/shadcn/button";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/shadcn/field";
import { Input } from "@/components/shadcn/input";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/shadcn/sheet";
import { TooltipProvider } from "@/components/shadcn/tooltip";
import { FieldHint, formatRange } from "@/components/UI/FieldHint";
import { OptionSelect } from "@/components/UI/Select";
import { SheetPanel } from "@/components/UI/Sheet";
import { engineConfigSchema, FFT_SIZES } from "@/lib/audio/config";
import { numberSpec } from "@/lib/form/number";
import { DeepKeysOfType } from "@tanstack/react-form";
import { Settings2 } from "lucide-react";
import { FC, useId } from "react";
import * as z from "zod";

import { SettingsForm } from "./form";
import { Settings, settingsSchema } from "./schema";

/** Fields rendered as a number input; the FFT size has its own control. */
type NumberName = Exclude<DeepKeysOfType<Settings, number>, "engine.fftSize">;

const GROUPS: { legend: string; fields: NumberName[] }[] = [
  {
    legend: "Mix & limiter",
    fields: [
      "engine.headroomDb",
      "engine.limiterThresholdDb",
      "engine.limiterKneeDb",
      "engine.limiterRatio",
      "engine.limiterAttackMs",
      "engine.limiterReleaseMs",
    ],
  },
  {
    legend: "Voices",
    fields: ["engine.maxVoices", "engine.chokeFadeMs", "engine.gainGlideMs"],
  },
  {
    legend: "Goniometer",
    fields: [
      "goniometer.dotSize",
      "goniometer.fadeMs",
      "goniometer.padding",
      "goniometer.gridAlpha",
    ],
  },
  {
    legend: "VU meters",
    fields: [
      "vu.referenceDbfs",
      "vu.damping",
      "vu.settleMs",
      "vu.maxPosition",
      "vu.halfSweepDeg",
    ],
  },
];

/** The schema behind a dotted field name, which is where its label lives. */
const numberSchemaOf = (name: NumberName): z.ZodNumber => {
  const [section, key] = name.split(".") as [keyof Settings, string];
  const shape: Record<string, z.ZodType> = settingsSchema.shape[section].shape;
  const schema = shape[key];
  if (!(schema instanceof z.ZodNumber)) throw new Error(`${name} not a number`);
  return schema;
};

const FFT_OPTIONS = FFT_SIZES.map((size) => ({
  value: String(size),
  label: String(size),
}));

interface SettingsSheetProps {
  form: SettingsForm;
  className?: string;
}

const NumberField: FC<{ form: SettingsForm; name: NumberName }> = ({
  form,
  name,
}) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const spec = numberSpec(numberSchemaOf(name));
  return (
    <form.Field name={name}>
      {(field) => {
        const isInvalid =
          field.state.meta.isTouched && !field.state.meta.isValid;
        const value = field.state.value;
        return (
          <Field orientation="horizontal" data-invalid={isInvalid}>
            <FieldContent>
              {/* The hint sits beside the label, not in it: a button inside a
                  label is invalid HTML and the text would leak into the
                  input's accessible name. */}
              <div className="flex items-center gap-2">
                <FieldLabel htmlFor={id}>
                  {spec.title}
                  {spec.unit && (
                    <span className="text-muted-foreground">{spec.unit}</span>
                  )}
                </FieldLabel>
                <FieldHint
                  id={hintId}
                  title={spec.title}
                  description={spec.description}
                  range={formatRange(spec.min, spec.max, spec.unit)}
                />
              </div>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </FieldContent>
            <Input
              id={id}
              name={field.name}
              type="number"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              // An emptied input reads as NaN, which the schema rejects.
              value={Number.isNaN(value) ? "" : value}
              onBlur={field.handleBlur}
              onChange={(event) =>
                field.handleChange(event.target.valueAsNumber)
              }
              aria-invalid={isInvalid}
              aria-describedby={hintId}
              className="w-24 flex-none"
            />
          </Field>
        );
      }}
    </form.Field>
  );
};

/** The select has no schema-driven spec, so its hint is read off the meta. */
const fftSizeHint = (): { title: string; description: string } => {
  const meta = engineConfigSchema.shape.fftSize.meta();
  if (typeof meta?.title !== "string" || typeof meta.description !== "string") {
    throw new Error("fftSize meta lacks title or description");
  }
  return { title: meta.title, description: meta.description };
};

const FftSizeField: FC<{ form: SettingsForm }> = ({ form }) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const hint = fftSizeHint();
  return (
    <form.Field name="engine.fftSize">
      {(field) => (
        <Field orientation="horizontal">
          <FieldContent>
            <div className="flex items-center gap-2">
              <FieldLabel htmlFor={id}>{hint.title}</FieldLabel>
              <FieldHint
                id={hintId}
                title={hint.title}
                description={hint.description}
              />
            </div>
          </FieldContent>
          <OptionSelect
            id={id}
            aria-describedby={hintId}
            name={field.name}
            items={FFT_OPTIONS}
            value={String(field.state.value)}
            onValueChange={(value) => {
              const size = FFT_SIZES.find((s) => String(s) === value);
              if (size) field.handleChange(size);
            }}
            className="w-24 flex-none"
          />
        </Field>
      )}
    </form.Field>
  );
};

/**
 * Gear button opening a side sheet with every knob of the sampler. Non-modal,
 * so the pads keep answering their keys while you tune by ear.
 */
export const SettingsSheet: FC<SettingsSheetProps> = ({ form, className }) => (
  <Sheet modal={false}>
    <SheetTrigger
      render={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Sampler settings"
          className={className}
        />
      }
    >
      <Settings2 />
    </SheetTrigger>
    <SheetPanel className="overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Settings</SheetTitle>
        <SheetDescription>
          Changes apply as you type. A value out of range is ignored until it is
          fixed.
        </SheetDescription>
      </SheetHeader>
      {/* One provider for every field hint in the sheet. */}
      <TooltipProvider delay={300}>
        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex flex-col gap-6 px-4"
        >
          {GROUPS.map(({ legend, fields }) => (
            <FieldSet key={legend}>
              <FieldLegend>{legend}</FieldLegend>
              <FieldGroup>
                {fields.map((name) => (
                  <NumberField key={name} form={form} name={name} />
                ))}
              </FieldGroup>
            </FieldSet>
          ))}
          <FieldSet>
            <FieldLegend>Analysis</FieldLegend>
            <FieldGroup>
              <FftSizeField form={form} />
              <NumberField form={form} name="engine.tailMs" />
            </FieldGroup>
          </FieldSet>
        </form>
      </TooltipProvider>
      <SheetFooter>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset to defaults
        </Button>
      </SheetFooter>
    </SheetPanel>
  </Sheet>
);
