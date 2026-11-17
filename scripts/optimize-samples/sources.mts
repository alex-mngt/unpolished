const WAV = /\.wav$/i;

/** `FX_Ah.wav` ships as `FX_Ah.flac`. */
export const flacName = (source: string) => source.replace(WAV, ".flac");

const compare = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

/** Alphabetical whatever the case, and still the same order on every machine. */
export const byName = (left: string, right: string) =>
  compare(left.toLowerCase(), right.toLowerCase()) || compare(left, right);

/**
 * The WAV files among the entries of the source directory, in a stable order.
 * Anything else stops the run: a sample in another format, or a second one
 * landing on the same FLAC, would otherwise be left out without a word.
 */
export const wavSources = (entries: string[]): string[] => {
  const visible = entries.filter((entry) => !entry.startsWith("."));
  const unexpected = visible.filter((entry) => !WAV.test(entry));
  if (unexpected.length > 0) {
    throw new Error(`Not a WAV file: ${unexpected.join(", ")}`);
  }
  const sources = visible.toSorted(byName);
  // Compared without the case: most macOS volumes cannot hold both files.
  const taken = new Map<string, string>();
  for (const source of sources) {
    const target = flacName(source).toLowerCase();
    const other = taken.get(target);
    if (other !== undefined) {
      throw new Error(
        `${other} and ${source} would both become ${flacName(source)}`,
      );
    }
    taken.set(target, source);
  }
  return sources;
};
