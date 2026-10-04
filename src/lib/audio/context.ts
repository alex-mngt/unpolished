import { createContext, useContext } from "react";

import type { AudioEngine } from "./engine";

export const AudioEngineContext = createContext<AudioEngine | null>(null);

export const useAudioEngine = (): AudioEngine => {
  const engine = useContext(AudioEngineContext);
  if (!engine) {
    throw new Error("useAudioEngine must be used inside AudioEngineContext");
  }
  return engine;
};
