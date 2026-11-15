import { InputMode } from "@/lib/audio/engine";
import { useForm } from "@tanstack/react-form";

/** Live controls: every change goes straight to the engine, nothing to submit. */
export const usePadForm = () =>
  useForm({
    defaultValues: {
      gain: 1,
      mode: "mono" as InputMode,
    },
  });

export type PadForm = ReturnType<typeof usePadForm>;
