/** Decibels to a linear amplitude ratio: 0 dB is 1, -6 dB is about 0.5. */
export const dbToGain = (db: number) => 10 ** (db / 20);

/** The inverse of `dbToGain`; 0 maps to -Infinity. */
export const gainToDb = (gain: number) => 20 * Math.log10(gain);
