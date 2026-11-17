/**
 * - `pending`: not known yet.
 * - `unsupported`: the browser has no Web MIDI.
 * - `prompt`: the browser would ask; nothing is requested until `connect`.
 * - `granted`: listening to every connected input.
 * - `denied`: the user blocked MIDI for this site.
 * - `unavailable`: the request failed for another reason; `connect` retries.
 */
export type MidiStatus =
  "pending" | "unsupported" | "prompt" | "granted" | "denied" | "unavailable";

export interface MidiState {
  status: MidiStatus;
  /** Names of the connected inputs, in the order the browser lists them. */
  inputs: readonly string[];
}

/** What `MidiInputs` needs from the browser. */
export interface MidiEnvironment {
  /** Left out when the browser has no Web MIDI. */
  requestAccess?: () => Promise<MIDIAccess>;
  /** Left out when the browser cannot report the permission. */
  queryPermission?: () => Promise<PermissionStatus>;
}

export type MessageListener = (data: Uint8Array) => void;

const NO_INPUTS: readonly string[] = [];

/** Where every `MidiInputs` starts, and all a server can render. */
export const INITIAL_MIDI_STATE: MidiState = {
  status: "pending",
  inputs: NO_INPUTS,
};

// Chrome's name for a refused request, then Firefox's.
const REFUSALS = new Set(["NotAllowedError", "SecurityError"]);

/**
 * Every MIDI input of the machine as one stream of messages, with the
 * permission that guards them. Lives outside React and knows nothing about
 * what the messages mean.
 */
export class MidiInputs {
  private environment: MidiEnvironment;
  private state = INITIAL_MIDI_STATE;
  private permission: PermissionStatus | null = null;
  private access: MIDIAccess | null = null;
  /** The request in flight, so that two callers share one prompt. */
  private request: Promise<void> | null = null;
  private stateListeners = new Set<() => void>();
  private messageListeners = new Set<MessageListener>();

  constructor(environment: MidiEnvironment) {
    this.environment = environment;
  }

  /** The same object until something changes. */
  getState(): MidiState {
    return this.state;
  }

  /** Calls `listener` whenever `getState` has something new to return. */
  subscribe(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Finds out where the permission stands and connects if it was granted
   * earlier, without ever making the browser ask. Resolves once the status
   * is known.
   */
  async start() {
    const { requestAccess, queryPermission } = this.environment;
    if (!requestAccess) return this.setState("unsupported");
    try {
      this.permission = (await queryPermission?.()) ?? null;
    } catch {
      // Not every browser knows the permission by name.
    }
    const { permission } = this;
    if (!permission) return this.setState("prompt");
    // The user can change their mind in the browser settings at any time.
    permission.onchange = () => void this.followPermission(permission.state);
    await this.followPermission(permission.state);
  }

  /**
   * Asks the browser for access, which makes it prompt unless the user has
   * answered before: call it from a click.
   */
  connect(): Promise<void> {
    const { requestAccess } = this.environment;
    if (!requestAccess || this.access) return Promise.resolve();
    this.request ??= this.open(requestAccess).finally(() => {
      this.request = null;
    });
    return this.request;
  }

  /** Every message of every input, as the bytes the device sent. */
  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  private async followPermission(state: PermissionState) {
    // Granted: the request resolves without a prompt.
    if (state === "granted") return this.connect();
    this.close();
    this.setState(state);
  }

  /** Lets go of every input: revoking a permission does not close them. */
  private close() {
    const { access } = this;
    if (!access) return;
    access.onstatechange = null;
    access.inputs.forEach((input) => {
      if (input.onmidimessage === this.receive) input.onmidimessage = null;
    });
    this.access = null;
  }

  private async open(requestAccess: () => Promise<MIDIAccess>) {
    try {
      this.access = await requestAccess();
    } catch (error) {
      return this.setState(this.refusal(error));
    }
    // Fires for a device plugged in or pulled out, and for a port opening.
    this.access.onstatechange = this.listen;
    this.listen();
  }

  /** Listens to every connected input, and lists them. */
  private listen = () => {
    const names: string[] = [];
    this.access?.inputs.forEach((input) => {
      if (input.state !== "connected") return;
      names.push(input.name ?? "Unknown device");
      // Setting the handler is what opens the port; a device that comes back
      // can do so as a new port, which has none yet.
      if (input.onmidimessage !== this.receive) {
        input.onmidimessage = this.receive;
      }
    });
    this.setState("granted", names);
  };

  private receive = ({ data }: MIDIMessageEvent) => {
    if (!data) return;
    for (const listener of this.messageListeners) listener(data);
  };

  /** Where a failed request leaves things. */
  private refusal(error: unknown): MidiStatus {
    const refused = error instanceof Error && REFUSALS.has(error.name);
    if (!refused) return "unavailable";
    // A dismissed prompt and a blocked site reject alike: the permission
    // tells them apart. Without it, stay where a click can try again.
    const state = this.permission?.state ?? "prompt";
    return state === "granted" ? "unavailable" : state;
  }

  private setState(status: MidiStatus, inputs = NO_INPUTS) {
    const { state } = this;
    const same =
      status === state.status &&
      inputs.length === state.inputs.length &&
      inputs.every((name, index) => name === state.inputs[index]);
    if (same) return;
    this.state = { status, inputs };
    for (const listener of this.stateListeners) listener();
  }
}
