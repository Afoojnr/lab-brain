/** One EDX measurement point: the atomic concentrations of its elements, and its spectrum if the file is there. */
export type Spot = {
  /** Where it is, e.g. `export/Image 1_analysis_3_spot`; unique within a characterization. */
  id: string;
  label: string;
  /** Element symbol → atomic concentration as a fraction (0.36 = 36 %), as in the file. */
  atomic: Record<string, number>;
  spectrum: { energyKev: number[]; counts: number[] } | null;
};

export type ElementStat = { mean: number; std: number };
