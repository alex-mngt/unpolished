import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Disk, Lock } from "./plan.mts";
import { flacName, wavSources } from "./sources.mts";

/** Holds the FLAC files the app ships, next to what the script generates. */
export const SAMPLES_DIR = fileURLToPath(
  new URL("../../src/samples/", import.meta.url),
);
/** Holds the WAV originals, which nothing ever rewrites. */
export const SOURCES_DIR = join(SAMPLES_DIR, "source");
export const LOCK_FILE = join(SAMPLES_DIR, "samples.lock.json");
export const MANIFEST_FILE = join(SAMPLES_DIR, "files.generated.ts");

export const sourcePath = (source: string) => join(SOURCES_DIR, source);

/** Where the FLAC made from `source` goes. */
export const flacPath = (source: string) =>
  join(SAMPLES_DIR, flacName(source));

export const sha256 = async (file: string) =>
  createHash("sha256")
    .update(await readFile(file))
    .digest("hex");

const hashes = async (directory: string, files: string[]) =>
  Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [file, await sha256(join(directory, file))]),
    ),
  ) as Record<string, string>;

/** The samples as they are on disk; throws on a source that is not a WAV. */
export const readDisk = async (): Promise<Disk> => {
  const sources = wavSources(await readdir(SOURCES_DIR));
  const flacs = (await readdir(SAMPLES_DIR)).filter((entry) =>
    entry.endsWith(".flac"),
  );
  return {
    sources: await hashes(SOURCES_DIR, sources),
    flacs: await hashes(SAMPLES_DIR, flacs),
  };
};

const read = async (file: string) => {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
};

/** The record of the last run; empty before the first one. */
export const readLock = async (): Promise<Lock> => {
  const content = await read(LOCK_FILE);
  return content === undefined
    ? { encoder: "", samples: {} }
    : (JSON.parse(content) as Lock);
};

export const renderLock = (lock: Lock) => `${JSON.stringify(lock, null, 2)}\n`;

/** Leaves the file alone when it already says so; tells whether it wrote. */
export const writeIfChanged = async (file: string, content: string) => {
  if ((await read(file)) === content) return false;
  await writeFile(file, content);
  return true;
};
