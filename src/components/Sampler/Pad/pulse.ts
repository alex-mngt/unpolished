/** A signal with no payload: a pad was hit. */
export interface Pulse {
  fire: () => void;
  subscribe: (listener: () => void) => () => void;
}

export const createPulse = (): Pulse => {
  const listeners = new Set<() => void>();
  return {
    fire: () => {
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
