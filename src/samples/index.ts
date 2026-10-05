export interface Sample {
  /** Name shown on the pad. */
  label: string;
  url: string;
}

/** `FX_stut bass_120bpm.wav` reads as `stut bass 120bpm`. */
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

// The bundler only emits a file whose `new URL` path is a literal, and the
// emitted URL is hashed: the file name has to be spelled out next to it.
const FILES = [
  { fileName: "FX_Ah.wav", url: new URL("./FX_Ah.wav", import.meta.url) },
  {
    fileName: "FX_apollo_106bpm.wav",
    url: new URL("./FX_apollo_106bpm.wav", import.meta.url),
  },
  { fileName: "FX_hum.wav", url: new URL("./FX_hum.wav", import.meta.url) },
  {
    fileName: "FX_like_120bpm.wav",
    url: new URL("./FX_like_120bpm.wav", import.meta.url),
  },
  {
    fileName: "FX_mask_140bpm.wav",
    url: new URL("./FX_mask_140bpm.wav", import.meta.url),
  },
  {
    fileName: "FX_phone_116bpm.wav",
    url: new URL("./FX_phone_116bpm.wav", import.meta.url),
  },
  {
    fileName: "FX_ring alarm_185bpm.wav",
    url: new URL("./FX_ring alarm_185bpm.wav", import.meta.url),
  },
  {
    fileName: "FX_stut bass_120bpm.wav",
    url: new URL("./FX_stut bass_120bpm.wav", import.meta.url),
  },
];

/** The bundled samples, in pad order. */
export const SAMPLES: readonly Sample[] = sortByFileName(FILES).map(
  ({ fileName, url }) => ({ label: sampleLabel(fileName), url: url.href }),
);
