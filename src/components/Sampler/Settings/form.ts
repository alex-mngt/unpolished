import { useForm, useStore } from "@tanstack/react-form";
import { useState } from "react";

import { DEFAULT_SETTINGS, Settings, settingsSchema } from "./schema";

/**
 * Live controls: nothing to submit. Every change is validated on the spot, so
 * the owner can apply the values whenever the whole form parses.
 */
export const useSettingsForm = () =>
  useForm({
    defaultValues: DEFAULT_SETTINGS,
    validators: { onChange: settingsSchema },
  });

export type SettingsForm = ReturnType<typeof useSettingsForm>;

/**
 * The last values of one section that parsed: a field being edited into an
 * invalid state keeps what it had. Each section is parsed on its own, so a
 * keystroke in one leaves the others' identity, and their consumers, alone.
 */
export const useValidSection = <K extends keyof Settings>(
  form: SettingsForm,
  section: K,
): Settings[K] => {
  // The selector memoizes the last valid parse, so an invalid edit returns
  // the same object as before and does not re-render the owner.
  const [select] = useState(() => {
    const schema = settingsSchema.shape[section];
    let input: unknown = DEFAULT_SETTINGS[section];
    let valid = DEFAULT_SETTINGS[section];
    return (state: { values: Settings }): Settings[K] => {
      const next = state.values[section];
      if (next !== input) {
        input = next;
        const parsed = schema.safeParse(next);
        if (parsed.success) valid = parsed.data as Settings[K];
      }
      return valid;
    };
  });
  return useStore(form.store, select);
};
