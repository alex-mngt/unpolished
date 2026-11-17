import { byName, flacName } from "./sources.mts";

/** SHA-256 of the files on disk, by file name. */
export interface Disk {
  sources: Record<string, string>;
  flacs: Record<string, string>;
}

/** What the last run converted, and how. */
export interface Lock {
  /** The encoder settings every FLAC was made with. */
  encoder: string;
  /** SHA-256 of each WAV and of the FLAC made from it, by WAV file name. */
  samples: Record<string, { source: string; flac: string }>;
}

export interface Plan {
  /** WAV files to convert. */
  encode: string[];
  /** FLAC files left behind by a WAV that is gone. */
  prune: string[];
}

/**
 * What a run has to do. A sample is left alone only while its WAV, its FLAC
 * and the encoder settings are all the ones recorded: a replaced WAV, a FLAC
 * edited by hand and new settings each get it converted again.
 */
export const plan = (disk: Disk, lock: Lock, encoder: string): Plan => {
  const sources = Object.keys(disk.sources).toSorted(byName);
  const settled = (source: string) => {
    const recorded = Object.hasOwn(lock.samples, source)
      ? lock.samples[source]
      : undefined;
    return (
      lock.encoder === encoder &&
      recorded !== undefined &&
      recorded.source === disk.sources[source] &&
      recorded.flac === disk.flacs[flacName(source)]
    );
  };
  const wanted = new Set(sources.map(flacName));
  return {
    encode: sources.filter((source) => !settled(source)),
    prune: Object.keys(disk.flacs)
      .filter((flac) => !wanted.has(flac))
      .toSorted(byName),
  };
};
