import { FILES } from "./files.generated";

export interface Sample {
  /** Name shown on the pad. */
  label: string;
  url: string;
}

/** `FX_stut bass_120bpm.flac` reads as `stut bass 120bpm`. */
export const sampleLabel = (fileName: string) =>
  fileName
    .replace(/^FX_/, "")
    .replace(/\.[^.]+$/, "")
    .replaceAll("_", " ");

/** Alphabetical by file name, whatever the case. */
export const sortByFileName = <T extends { fileName: string }>(files: T[]) =>
  files.toSorted((a, b) => {
    const left = a.fileName.toLowerCase();
    const right = b.fileName.toLowerCase();
    return left < right ? -1 : left > right ? 1 : 0;
  });

/** The bundled samples, in pad order. */
export const SAMPLES: readonly Sample[] = sortByFileName(FILES).map(
  ({ fileName, url }) => ({ label: sampleLabel(fileName), url: url.href }),
);
