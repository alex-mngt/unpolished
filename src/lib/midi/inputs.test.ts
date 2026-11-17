import { describe, expect, test, vi } from "vitest";

import { type MidiEnvironment, MidiInputs } from "./inputs";

interface FakeInput {
  id: string;
  name: string | null;
  state: MIDIPortDeviceState;
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

const input = (name: string | null, id = String(name)): FakeInput => ({
  id,
  name,
  state: "connected",
  onmidimessage: null,
});

/** Stands in for the browser's `MIDIAccess`: ports can be plugged and pulled. */
class FakeAccess {
  inputs = new Map<string, FakeInput>();
  onstatechange: (() => void) | null = null;

  constructor(...ports: FakeInput[]) {
    for (const port of ports) this.inputs.set(port.id, port);
  }

  plug(port: FakeInput) {
    port.state = "connected";
    this.inputs.set(port.id, port);
    this.onstatechange?.();
  }

  unplug(port: FakeInput) {
    port.state = "disconnected";
    this.onstatechange?.();
  }
}

class FakePermission {
  onchange: (() => void) | null = null;

  constructor(public state: PermissionState) {}

  change(state: PermissionState) {
    this.state = state;
    this.onchange?.();
  }
}

const send = (port: FakeInput, ...bytes: number[]) =>
  port.onmidimessage?.({ data: Uint8Array.from(bytes) } as MIDIMessageEvent);

const rejection = (name: string) => new DOMException("refused", name);

interface BrowserOptions {
  /** Left out: the browser cannot report the permission. */
  permission?: FakePermission;
  access?: FakeAccess;
  /** Replaces the default request, which resolves with `access`. */
  request?: () => Promise<FakeAccess>;
}

/** A browser with Web MIDI, as far as `MidiInputs` can tell. */
const browser = ({
  permission,
  access = new FakeAccess(),
  request = async () => access,
}: BrowserOptions = {}) => {
  const requestAccess = vi.fn(request as unknown as () => Promise<MIDIAccess>);
  const environment: MidiEnvironment = { requestAccess };
  if (permission) {
    environment.queryPermission = async () =>
      permission as unknown as PermissionStatus;
  }
  return { midi: new MidiInputs(environment), requestAccess, access };
};

describe("MidiInputs", () => {
  test("does not know where it stands before it starts", () => {
    const { midi } = browser();
    expect(midi.getState()).toEqual({ status: "pending", inputs: [] });
  });

  test("reports a browser without Web MIDI as unsupported", async () => {
    const midi = new MidiInputs({});
    await midi.start();
    expect(midi.getState().status).toBe("unsupported");
  });

  test("waits for a click when access was never granted", async () => {
    const { midi, requestAccess } = browser({
      permission: new FakePermission("prompt"),
    });
    await midi.start();
    expect(midi.getState().status).toBe("prompt");
    expect(requestAccess).not.toHaveBeenCalled();
  });

  test("waits for a click when the browser cannot report the permission", async () => {
    const { midi, requestAccess } = browser();
    await midi.start();
    expect(midi.getState().status).toBe("prompt");
    expect(requestAccess).not.toHaveBeenCalled();
  });

  test("waits for a click when asking for the permission fails", async () => {
    const requestAccess = vi.fn<() => Promise<MIDIAccess>>();
    const midi = new MidiInputs({
      requestAccess,
      queryPermission: () => Promise.reject(new TypeError("unknown name")),
    });
    await midi.start();
    expect(midi.getState().status).toBe("prompt");
    expect(requestAccess).not.toHaveBeenCalled();
  });

  test("connects without a click when access was granted earlier", async () => {
    const { midi, requestAccess } = browser({
      permission: new FakePermission("granted"),
      access: new FakeAccess(input("MPD218"), input("Keystation")),
    });
    await midi.start();
    expect(midi.getState()).toEqual({
      status: "granted",
      inputs: ["MPD218", "Keystation"],
    });
    expect(requestAccess).toHaveBeenCalledTimes(1);
  });

  test("connects on a click", async () => {
    const { midi } = browser({
      permission: new FakePermission("prompt"),
      access: new FakeAccess(input("MPD218")),
    });
    await midi.start();
    await midi.connect();
    expect(midi.getState()).toEqual({ status: "granted", inputs: ["MPD218"] });
  });

  test("is granted with no device plugged in", async () => {
    const { midi } = browser({ permission: new FakePermission("granted") });
    await midi.start();
    expect(midi.getState()).toEqual({ status: "granted", inputs: [] });
  });

  test("leaves out the inputs that are unplugged", async () => {
    const gone = input("Keystation");
    gone.state = "disconnected";
    const { midi } = browser({
      permission: new FakePermission("granted"),
      access: new FakeAccess(input("MPD218"), gone),
    });
    await midi.start();
    expect(midi.getState().inputs).toEqual(["MPD218"]);
  });

  test("names an input the browser has no name for", async () => {
    const { midi } = browser({
      permission: new FakePermission("granted"),
      access: new FakeAccess(input(null, "port-1")),
    });
    await midi.start();
    expect(midi.getState().inputs).toEqual(["Unknown device"]);
  });

  test("asks once when clicked twice while the browser is asking", async () => {
    const { midi, requestAccess } = browser({
      permission: new FakePermission("prompt"),
    });
    await midi.start();
    await Promise.all([midi.connect(), midi.connect()]);
    expect(requestAccess).toHaveBeenCalledTimes(1);
  });

  test("keeps waiting for a click when the prompt is dismissed", async () => {
    const { midi } = browser({
      permission: new FakePermission("prompt"),
      request: () => Promise.reject(rejection("NotAllowedError")),
    });
    await midi.start();
    await midi.connect();
    expect(midi.getState().status).toBe("prompt");
  });

  test("keeps waiting for a click when Firefox reports the dismissed prompt", async () => {
    const { midi } = browser({
      permission: new FakePermission("prompt"),
      // Firefox refuses with a SecurityError where Chrome says NotAllowedError.
      request: () => Promise.reject(rejection("SecurityError")),
    });
    await midi.start();
    await midi.connect();
    expect(midi.getState().status).toBe("prompt");
  });

  test("keeps waiting for a click when a browser that cannot report the permission refuses", async () => {
    const { midi } = browser({
      request: () => Promise.reject(rejection("NotAllowedError")),
    });
    await midi.start();
    await midi.connect();
    expect(midi.getState().status).toBe("prompt");
  });

  test("is denied, and never asks, when the user blocked MIDI earlier", async () => {
    const { midi, requestAccess } = browser({
      permission: new FakePermission("denied"),
    });
    await midi.start();
    expect(midi.getState().status).toBe("denied");
    expect(requestAccess).not.toHaveBeenCalled();
  });

  test("is denied when the user blocks MIDI from the prompt", async () => {
    const permission = new FakePermission("prompt");
    const { midi } = browser({
      permission,
      request: () => {
        permission.state = "denied";
        return Promise.reject(rejection("NotAllowedError"));
      },
    });
    await midi.start();
    await midi.connect();
    expect(midi.getState().status).toBe("denied");
  });

  test("is unavailable when the system fails, and a click tries again", async () => {
    const access = new FakeAccess(input("MPD218"));
    let failing = true;
    const { midi } = browser({
      permission: new FakePermission("prompt"),
      request: () =>
        failing
          ? Promise.reject(rejection("InvalidStateError"))
          : Promise.resolve(access),
    });
    await midi.start();
    await midi.connect();
    expect(midi.getState().status).toBe("unavailable");

    failing = false;
    await midi.connect();
    expect(midi.getState()).toEqual({ status: "granted", inputs: ["MPD218"] });
  });

  test("is unavailable when a granted permission is still refused", async () => {
    const { midi } = browser({
      permission: new FakePermission("granted"),
      request: () => Promise.reject(rejection("NotAllowedError")),
    });
    await midi.start();
    expect(midi.getState().status).toBe("unavailable");
  });

  test("passes on the messages of every input", async () => {
    const pads = input("MPD218");
    const keys = input("Keystation");
    const { midi } = browser({
      permission: new FakePermission("granted"),
      access: new FakeAccess(pads, keys),
    });
    const messages: number[][] = [];
    midi.onMessage((data) => messages.push([...data]));
    await midi.start();

    send(pads, 0x99, 36, 100);
    send(keys, 0x90, 60, 64);
    expect(messages).toEqual([
      [0x99, 36, 100],
      [0x90, 60, 64],
    ]);
  });

  test("stops passing messages to a listener that left", async () => {
    const pads = input("MPD218");
    const { midi } = browser({
      permission: new FakePermission("granted"),
      access: new FakeAccess(pads),
    });
    const onMessage = vi.fn();
    const leave = midi.onMessage(onMessage);
    await midi.start();

    leave();
    send(pads, 0x99, 36, 100);
    expect(onMessage).not.toHaveBeenCalled();
  });

  test("skips an event that carries no data", async () => {
    const pads = input("MPD218");
    const { midi } = browser({
      permission: new FakePermission("granted"),
      access: new FakeAccess(pads),
    });
    const onMessage = vi.fn();
    midi.onMessage(onMessage);
    await midi.start();

    pads.onmidimessage?.({ data: null } as MIDIMessageEvent);
    expect(onMessage).not.toHaveBeenCalled();
  });

  test("picks up an input plugged in later", async () => {
    const { midi, access } = browser({
      permission: new FakePermission("granted"),
    });
    const onMessage = vi.fn();
    midi.onMessage(onMessage);
    await midi.start();

    const pads = input("MPD218");
    access.plug(pads);
    expect(midi.getState()).toEqual({ status: "granted", inputs: ["MPD218"] });

    send(pads, 0x99, 36, 100);
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  test("forgets an unplugged input, and hears it again once it is back", async () => {
    const pads = input("MPD218");
    const { midi, access } = browser({
      permission: new FakePermission("granted"),
      access: new FakeAccess(pads),
    });
    const onMessage = vi.fn();
    midi.onMessage(onMessage);
    await midi.start();

    access.unplug(pads);
    expect(midi.getState()).toEqual({ status: "granted", inputs: [] });

    access.plug(pads);
    expect(midi.getState().inputs).toEqual(["MPD218"]);
    send(pads, 0x99, 36, 100);
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  test("hears a replugged device that comes back as a new port", async () => {
    const { midi, access } = browser({
      permission: new FakePermission("granted"),
      access: new FakeAccess(input("MPD218", "port-1")),
    });
    const onMessage = vi.fn();
    midi.onMessage(onMessage);
    await midi.start();

    const back = input("MPD218", "port-2");
    access.plug(back);
    send(back, 0x99, 36, 100);
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  test("tells subscribers about every change of state", async () => {
    const { midi, access } = browser({
      permission: new FakePermission("granted"),
    });
    const states: unknown[] = [];
    midi.subscribe(() => states.push(midi.getState()));
    await midi.start();
    access.plug(input("MPD218"));

    expect(states).toEqual([
      { status: "granted", inputs: [] },
      { status: "granted", inputs: ["MPD218"] },
    ]);
  });

  test("keeps its state, and stays quiet, when a port event changes nothing", async () => {
    const { midi, access } = browser({
      permission: new FakePermission("granted"),
      access: new FakeAccess(input("MPD218")),
    });
    await midi.start();
    const before = midi.getState();
    const onChange = vi.fn();
    midi.subscribe(onChange);

    // What the browser fires when a port finishes opening.
    access.onstatechange?.();
    expect(midi.getState()).toBe(before);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("stops telling a subscriber that left", async () => {
    const { midi } = browser({ permission: new FakePermission("granted") });
    const onChange = vi.fn();
    midi.subscribe(onChange)();
    await midi.start();
    expect(onChange).not.toHaveBeenCalled();
  });

  test("stops listening as soon as the permission is revoked", async () => {
    const pads = input("MPD218");
    const permission = new FakePermission("granted");
    const { midi } = browser({ permission, access: new FakeAccess(pads) });
    const onMessage = vi.fn();
    midi.onMessage(onMessage);
    await midi.start();

    permission.change("denied");
    expect(midi.getState()).toEqual({ status: "denied", inputs: [] });
    send(pads, 0x99, 36, 100);
    expect(onMessage).not.toHaveBeenCalled();
  });

  test("ignores devices plugged in after the permission is revoked", async () => {
    const permission = new FakePermission("granted");
    const { midi, access } = browser({ permission });
    await midi.start();

    permission.change("prompt");
    access.plug(input("MPD218"));
    expect(midi.getState()).toEqual({ status: "prompt", inputs: [] });
  });

  test("connects as soon as the permission is granted from the browser settings", async () => {
    const permission = new FakePermission("denied");
    const { midi } = browser({
      permission,
      access: new FakeAccess(input("MPD218")),
    });
    await midi.start();

    permission.change("granted");
    await vi.waitFor(() =>
      expect(midi.getState()).toEqual({
        status: "granted",
        inputs: ["MPD218"],
      }),
    );
  });

  test("connects again when a revoked permission is granted back", async () => {
    const pads = input("MPD218");
    const permission = new FakePermission("granted");
    const { midi, requestAccess } = browser({
      permission,
      access: new FakeAccess(pads),
    });
    const onMessage = vi.fn();
    midi.onMessage(onMessage);
    await midi.start();

    permission.change("prompt");
    permission.change("granted");
    await vi.waitFor(() => expect(midi.getState().status).toBe("granted"));
    expect(requestAccess).toHaveBeenCalledTimes(2);
    send(pads, 0x99, 36, 100);
    expect(onMessage).toHaveBeenCalledTimes(1);
  });
});
