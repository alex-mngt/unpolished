import { readFile } from "node:fs/promises";
import { beforeAll, describe, expect, test } from "vitest";

import { MANIFEST_FILE, readDisk, readLock } from "./disk.mts";
import { ENCODER } from "./ffmpeg.mts";
import { renderManifest } from "./manifest.mts";
import { plan } from "./plan.mts";
import type { Disk, Lock } from "./plan.mts";
import { flacName } from "./sources.mts";

// Guards the committed samples, without needing ffmpeg: a WAV added, replaced
// or removed without running the script again fails here.
describe("the samples in the repository", () => {
  const hint = "Run `pnpm optimize-samples`";
  let disk: Disk;
  let lock: Lock;

  beforeAll(async () => {
    disk = await readDisk();
    lock = await readLock();
  });

  test("have each WAV converted, from its current content and settings", () => {
    expect(plan(disk, lock, ENCODER).encode, hint).toEqual([]);
  });

  test("hold no FLAC whose WAV is gone", () => {
    expect(plan(disk, lock, ENCODER).prune, hint).toEqual([]);
  });

  test("are the only ones the lock records", () => {
    expect(Object.keys(lock.samples), hint).toEqual(Object.keys(disk.sources));
  });

  test("are the ones the app lists", async () => {
    const manifest = await readFile(MANIFEST_FILE, "utf8").catch(() => "");
    expect(manifest, hint).toBe(
      renderManifest(Object.keys(disk.sources).map(flacName)),
    );
  });
});
