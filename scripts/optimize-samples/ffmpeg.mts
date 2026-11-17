import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { TargetFormat } from "./format.mts";

const run = promisify(execFile);

// Lossless whatever the settings: these only trade encoding time for size.
// A prediction order above 12 would compress further, but leaves the FLAC
// subset every decoder has to handle, and each browser brings its own decoder.
// Metadata is dropped and the output made bit-exact so that the same WAV gives
// the same FLAC on every machine.
const ENCODER_ARGS = [
  "-c:a",
  "flac",
  "-compression_level",
  "12",
  "-max_prediction_order",
  "12",
  "-exact_rice_parameters",
  "1",
  "-lpc_type",
  "cholesky",
  "-lpc_passes",
  "8",
  "-map",
  "0:a:0",
  "-map_metadata",
  "-1",
  "-bitexact",
];

/** The encoder settings, as recorded in the lock. */
export const ENCODER = ENCODER_ARGS.join(" ");

// ffmpeg cuts a deeper sample down to 24 bits by dropping the bits below it.
// Rounding to the nearest 24-bit step beforehand leaves it nothing to drop.
const ROUND_TO_24_BITS = "aeval=floor(val(ch)*8388608+0.5)/8388608:c=same";

const reduction = (format: TargetFormat) =>
  format.exact ? [] : ["-af", ROUND_TO_24_BITS];

/** Stops the run when ffmpeg is missing, with the way to get it. */
export const preflight = async () => {
  for (const tool of ["ffmpeg", "ffprobe"]) {
    try {
      await run(tool, ["-version"]);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      throw new Error(
        `${tool} is not installed. Install ffmpeg, which brings both ffmpeg and ffprobe: brew install ffmpeg`,
      );
    }
  }
};

export interface AudioInfo {
  codec: string;
  sampleRate: number;
  channels: number;
  /** Known for FLAC only. */
  bits: number | undefined;
}

export const probe = async (file: string): Promise<AudioInfo> => {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_name,sample_rate,channels,bits_per_raw_sample",
    "-of",
    "json",
    file,
  ]);
  const [stream] = (
    JSON.parse(stdout) as {
      streams: {
        codec_name: string;
        sample_rate: string;
        channels: number;
        bits_per_raw_sample?: string;
      }[];
    }
  ).streams;
  if (!stream) throw new Error("No audio stream");
  return {
    codec: stream.codec_name,
    sampleRate: Number(stream.sample_rate),
    channels: stream.channels,
    bits:
      stream.bits_per_raw_sample === undefined
        ? undefined
        : Number(stream.bits_per_raw_sample),
  };
};

const LEVELS = "astats=measure_perchannel=none:measure_overall=Min_level+Max_level";

export interface Peak {
  /** The highest sample, where full scale is 1; to six decimals. */
  level: number;
  /** Whether any sample is past full scale, however slightly. */
  clips: boolean;
}

/** How far a float source reaches. */
export const peak = async (file: string): Promise<Peak> => {
  const { stderr } = await run("ffmpeg", [
    "-hide_banner",
    "-nostdin",
    "-nostats",
    "-i",
    file,
    "-map",
    "0:a:0",
    // The level is only reported rounded. To tell a sample past full scale
    // exactly, the samples are then swapped for 1 where they are and 0 where
    // they are not, and measured again.
    "-af",
    `${LEVELS},aeval=gt(abs(val(ch))\\,1):c=same,${LEVELS}`,
    "-f",
    "null",
    "-",
  ]);
  const levels = [...stderr.matchAll(/(?:Min|Max) level: (\S+)/g)].map(
    ([, level]) => Math.abs(Number(level)),
  );
  if (levels.length !== 4 || levels.some(Number.isNaN)) {
    throw new Error("Could not measure the peak level");
  }
  const [lowest, highest, , past] = levels;
  return { level: Math.max(lowest, highest), clips: past > 0 };
};

/**
 * MD5 of the samples the file decodes to, at the bit depth of `format`. For a
 * source deeper than that, of its samples once rounded down to it.
 */
export const pcmMd5 = async (
  file: string,
  format: TargetFormat,
  { source }: { source: boolean },
): Promise<string> => {
  const { stdout } = await run("ffmpeg", [
    "-v",
    "error",
    "-nostdin",
    "-i",
    file,
    "-map",
    "0:a:0",
    ...(source ? reduction(format) : []),
    "-c:a",
    `pcm_s${format.bits}le`,
    "-f",
    "md5",
    "-",
  ]);
  return stdout.trim();
};

/** Converts `source` into a FLAC at `target`, overwriting it. */
export const encode = async (
  source: string,
  target: string,
  format: TargetFormat,
) => {
  await run("ffmpeg", [
    "-v",
    "error",
    "-nostdin",
    "-y",
    "-i",
    source,
    ...reduction(format),
    ...(format.exact ? [] : ["-sample_fmt", "s32", "-bits_per_raw_sample", "24"]),
    ...ENCODER_ARGS,
    // The target is a temporary file: its name does not tell the format.
    "-f",
    "flac",
    target,
  ]);
};
