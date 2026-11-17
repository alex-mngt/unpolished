// Converts the WAV originals of `src/samples/source` into the FLAC files the
// app ships, and regenerates the module listing them. Run it with
// `pnpm optimize-samples` after adding, replacing or removing a WAV: it only
// touches what changed, and writes nothing when nothing did.

import { rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import {
  flacPath,
  LOCK_FILE,
  MANIFEST_FILE,
  readDisk,
  readLock,
  renderLock,
  SAMPLES_DIR,
  sha256,
  sourcePath,
  writeIfChanged,
} from "./optimize-samples/disk.mts";
import {
  encode,
  ENCODER,
  pcmMd5,
  peak,
  preflight,
  probe,
} from "./optimize-samples/ffmpeg.mts";
import type { AudioInfo } from "./optimize-samples/ffmpeg.mts";
import { targetFormat } from "./optimize-samples/format.mts";
import type { TargetFormat } from "./optimize-samples/format.mts";
import { renderManifest } from "./optimize-samples/manifest.mts";
import { plan } from "./optimize-samples/plan.mts";
import type { Lock } from "./optimize-samples/plan.mts";
import { flacName } from "./optimize-samples/sources.mts";

// Above this, the extra samples only cost bytes: a browser resamples every
// sample to the rate of the audio device when decoding it.
const HIGHEST_USEFUL_RATE = 48_000;

interface Job {
  source: string;
  info: AudioInfo;
  format: TargetFormat;
}

const size = async (file: string) => (await stat(file)).size;

const kilobytes = (bytes: number) => `${Math.round(bytes / 1000)} kB`;

const megabytes = (bytes: number) => `${(bytes / 1e6).toFixed(2)} MB`;

/** Names the sample an error is about. */
const about = async <T,>(source: string, work: () => Promise<T>) => {
  try {
    return await work();
  } catch (error) {
    throw new Error(`${source}: ${(error as Error).message}`, { cause: error });
  }
};

/** Looks at a source without writing anything; throws when it cannot ship. */
const inspect = async (source: string): Promise<Job> => {
  const file = sourcePath(source);
  const info = await probe(file);
  const format = targetFormat(info.codec);
  if (format.float) {
    const { level, clips } = await peak(file);
    if (clips) {
      throw new Error(
        `Goes past full scale (${level.toFixed(6)} at its highest, for a full scale of 1), which FLAC would clip: lower its level or export it as 24-bit PCM`,
      );
    }
  }
  if (!format.exact) {
    console.warn(
      `${source}: ${info.codec} goes down to ${format.bits} bits, the most a browser plays back`,
    );
  }
  if (info.sampleRate > HIGHEST_USEFUL_RATE) {
    console.warn(
      `${source}: ${info.sampleRate} Hz is kept as is, but a browser plays back ${HIGHEST_USEFUL_RATE} Hz at most`,
    );
  }
  return { source, info, format };
};

/** Fails unless the FLAC decodes to the samples of the source. */
const verify = async (flac: string, { source, info, format }: Job) => {
  const [expected, actual, result] = await Promise.all([
    pcmMd5(sourcePath(source), format, { source: true }),
    pcmMd5(flac, format, { source: false }),
    probe(flac),
  ]);
  if (actual !== expected) {
    throw new Error("The FLAC does not decode to the samples of the WAV");
  }
  if (
    result.codec !== "flac" ||
    result.sampleRate !== info.sampleRate ||
    result.channels !== info.channels ||
    result.bits !== format.bits
  ) {
    throw new Error(
      `The FLAC came out as ${result.sampleRate} Hz, ${result.channels} channels, ${result.bits} bits`,
    );
  }
};

/** Only a FLAC that passed the check ever takes the place of the last one. */
const convert = async (job: Job) => {
  const draft = join(SAMPLES_DIR, `.${flacName(job.source)}.tmp`);
  try {
    await encode(sourcePath(job.source), draft, job.format);
    await verify(draft, job);
    await rename(draft, flacPath(job.source));
  } finally {
    await rm(draft, { force: true });
  }
};

const main = async () => {
  await preflight();
  const disk = await readDisk();
  const sources = Object.keys(disk.sources);
  const { encode: stale, prune } = plan(disk, await readLock(), ENCODER);

  // Every source is looked at before the first write: a sample that cannot
  // ship stops the run with the others untouched.
  const jobs: Job[] = [];
  for (const source of stale) {
    jobs.push(await about(source, () => inspect(source)));
  }

  // Before converting: where file names ignore the case, the FLAC left by a
  // WAV renamed from `Kick.wav` to `kick.wav` is the very file about to be
  // written.
  for (const flac of prune) {
    await rm(join(SAMPLES_DIR, flac));
    console.log(`${flac}: removed, its WAV is gone`);
  }

  for (const job of jobs) {
    const { source } = job;
    await about(source, () => convert(job));
    disk.flacs[flacName(source)] = await sha256(flacPath(source));
    console.log(
      `${source}: ${kilobytes(await size(sourcePath(source)))} to ${kilobytes(await size(flacPath(source)))}`,
    );
  }

  const lock: Lock = {
    encoder: ENCODER,
    samples: Object.fromEntries(
      sources.map((source) => [
        source,
        { source: disk.sources[source], flac: disk.flacs[flacName(source)] },
      ]),
    ),
  };
  await writeIfChanged(LOCK_FILE, renderLock(lock));
  await writeIfChanged(MANIFEST_FILE, renderManifest(sources.map(flacName)));

  let wav = 0;
  let flac = 0;
  for (const source of sources) {
    wav += await size(sourcePath(source));
    flac += await size(flacPath(source));
  }
  console.log(
    `${sources.length} samples, ${jobs.length} converted, ${prune.length} removed: ${megabytes(wav)} of WAV ship as ${megabytes(flac)} of FLAC`,
  );
};

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
