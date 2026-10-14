/** One point of a spectrum: the wavenumber (cm⁻¹) and the measured value. */
export type SpectrumPoint = { x: number; y: number };

/** What the values of a file are. Transmittance is read as a percentage (0–100). */
export type SpectrumReading = 'transmittance' | 'absorbance';

/** Which way a peak points: a dip in transmittance, a tip in absorbance. */
export type PeakOrientation = 'dip' | 'tip';

export type NormalisationMethod = 'none' | 'minmax' | 'peak' | 'vector' | 'snv';

/** A wavenumber interval, low to high. */
export type WavenumberRange = { from: number; to: number };

/** A peak the user keeps, with their own free-text label for the bond. */
export type FtirPeak = {
  id: string;
  /** Wavenumber in cm⁻¹. */
  position: number;
  label: string;
};

/**
 * What the user chose for the FTIR analysis; saved with the characterization.
 * Only choices live here: spectra are always recomputed from the raw files.
 */
export type FtirSettings = {
  /** What the file's values are; null means use what the values suggest. */
  reading: SpectrumReading | null;
  /** Show and measure absorbance (A = 2 − log10 %T) instead of transmittance. */
  convertToAbsorbance: boolean;
  normalisation: {
    method: NormalisationMethod;
    /** Min–max: the interval to scale over; null means the whole spectrum. */
    range: WavenumberRange | null;
    /** Reference peak: the wavenumber whose value becomes 1. */
    referencePosition: number | null;
  };
  detection: {
    /** Where to look for peaks; null means the whole spectrum. */
    range: WavenumberRange | null;
    /** How prominent a peak must be, as a fraction of the spectrum's span. */
    sensitivity: number;
    /** Peaks closer than this (cm⁻¹) count once. */
    minSpacing: number;
  };
  /** A peak's value is read within this distance (cm⁻¹) of its position. */
  tolerance: number;
  /** Vertical gap between stacked spectra, as a fraction of one spectrum's span. */
  offset: number;
  /** The peaks to measure, curated by the user. */
  peaks: FtirPeak[];
};
