import * as z from "zod";

export interface NumberFieldSpec {
  title: string;
  /** Shown next to the title, e.g. "ms". */
  unit?: string;
  /** What changing it does to the experience; shown as a hint on the form. */
  description: string;
  min: number;
  max: number;
  /** Spinner increment of the input; values in between are still valid. */
  step: number;
}

const describe = <T extends z.ZodNumber>(
  schema: T,
  { title, unit, description, min, max, step }: NumberFieldSpec,
) =>
  schema
    .min(min, `At least ${min}`)
    .max(max, `At most ${max}`)
    .meta({ title, unit, description, step });

/**
 * A bounded number whose label, unit, hint and step travel with the schema,
 * so a form can render it without a second table of the same facts.
 */
export const numberField = (spec: NumberFieldSpec) =>
  describe(z.number({ error: "Enter a number" }), spec);

export const integerField = (spec: NumberFieldSpec) =>
  describe(z.int({ error: "Enter a whole number" }), spec);

/** Reads back what `numberField` stored. Throws on a schema it did not make. */
export const numberSpec = (schema: z.ZodNumber): NumberFieldSpec => {
  const meta = schema.meta();
  const { minValue: min, maxValue: max } = schema;
  if (
    typeof meta?.title !== "string" ||
    typeof meta.description !== "string" ||
    typeof meta.step !== "number" ||
    min === null ||
    max === null
  ) {
    throw new Error("Not a numberField schema");
  }
  return {
    title: meta.title,
    unit: typeof meta.unit === "string" ? meta.unit : undefined,
    description: meta.description,
    min,
    max,
    step: meta.step,
  };
};
