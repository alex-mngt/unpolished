export interface TargetFormat {
  /** Bit depth of the FLAC. */
  bits: 16 | 24;
  /** Whether the FLAC decodes to the very samples of the source. */
  exact: boolean;
  /** Float samples can exceed full scale, which integers would clip. */
  float: boolean;
}

// FLAC holds integers only, and no browser is known to decode more than 24
// bits of them. A browser plays 32-bit floats anyway, which carry 24 bits of
// precision: a deeper source loses nothing audible on the way down.
const FORMATS: Record<string, TargetFormat> = {
  pcm_s16le: { bits: 16, exact: true, float: false },
  pcm_s24le: { bits: 24, exact: true, float: false },
  pcm_s32le: { bits: 24, exact: false, float: false },
  pcm_f32le: { bits: 24, exact: false, float: true },
  pcm_f64le: { bits: 24, exact: false, float: true },
};

/** The FLAC a source of this codec becomes; throws on one it cannot become. */
export const targetFormat = (codec: string): TargetFormat => {
  if (!Object.hasOwn(FORMATS, codec)) {
    throw new Error(
      `Unsupported audio format ${codec}: export it as 16-bit or 24-bit PCM`,
    );
  }
  return FORMATS[codec];
};
