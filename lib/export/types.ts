/** One picture to place on a page or slide, as a PNG data URL with its size in pixels. */
export type ExportImage = {
  dataUrl: string;
  width: number;
  height: number;
};

/**
 * One page of a PDF or one slide of a presentation: a title, an optional
 * picture, and lines of text under it. Plots, and later a project or sample
 * report, are both built from a list of these.
 */
export type ExportPage = {
  title: string;
  image?: ExportImage;
  lines: string[];
};

/** A table to write as Excel or CSV. A `null` cell is left empty, never 0. */
export type ExportTable = {
  headers: string[];
  rows: (string | number | null)[][];
};
