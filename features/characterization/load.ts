import { datasetBytes } from '@/features/experiments/server';
import type { Dataset } from '@/features/experiments/shared';

import { parseEmsa, parseQuantification } from './techniques/edx/parse';
import { edxValues } from './techniques/edx/stats';
import type { Spot } from './techniques/edx/types';
import {
  ellipsometryValues,
  parseSeqfit
} from './techniques/ellipsometry/parse';
import type { SeqfitFile } from './techniques/ellipsometry/parse';
import type { AnalysisKind, AnalysisSettings, AnalysisValue } from './types';

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/** Where a file sat inside its uploaded folder: `export/Image 1_analysis_3_spot`. */
const directoryOf = (dataset: Dataset): string => {
  const path = dataset.relativePath ?? '';
  const slash = path.lastIndexOf('/');

  return slash === -1 ? '' : path.slice(0, slash);
};

const spotIdOf = (dataset: Dataset): string => {
  const directory = directoryOf(dataset);

  // A loose file has no folder to say which spot it is, so it is its own spot.
  return directory === ''
    ? `file:${dataset.id}`
    : `${dataset.folder ?? ''}/${directory}`;
};

export type SpotProblem = { file: string; reason: string };

/**
 * Reads a characterization's EDX spots: every `quantification.csv` is one spot,
 * with the `spectrum.emsa` next to it when there is one. A file that cannot be
 * read is reported, not skipped silently.
 *
 * @param datasets - The characterization's attached files.
 * @param options - `withSpectra: false` skips the spectra, to keep a list of many samples light.
 */
export const loadEdxSpots = async (
  datasets: Dataset[],
  options: { withSpectra?: boolean } = {}
): Promise<{ spots: Spot[]; problems: SpotProblem[] }> => {
  const spectra = new Map(
    datasets
      .filter(item => item.fileName.toLowerCase() === 'spectrum.emsa')
      .map(item => [spotIdOf(item), item])
  );
  const spots: Spot[] = [];
  const problems: SpotProblem[] = [];

  for (const dataset of datasets.filter(
    item => item.fileName.toLowerCase() === 'quantification.csv'
  )) {
    const file = await datasetBytes(dataset.id);
    const parsed = file ? parseQuantification(decode(file.bytes)) : null;
    if (!parsed?.isOk) {
      problems.push({
        file: dataset.relativePath ?? dataset.fileName,
        reason: parsed?.reason ?? 'unreadable'
      });
      continue;
    }

    const id = spotIdOf(dataset);
    const spectrumFile =
      options.withSpectra === false ? undefined : spectra.get(id);
    const spectrumBytes = spectrumFile
      ? await datasetBytes(spectrumFile.id)
      : null;
    const directory = directoryOf(dataset);
    spots.push({
      id,
      label:
        directory === ''
          ? dataset.fileName
          : (directory.split('/').pop() ?? directory),
      atomic: parsed.atomic,
      spectrum: spectrumBytes ? parseEmsa(decode(spectrumBytes.bytes)) : null
    });
  }

  return {
    spots: spots.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true })
    ),
    problems
  };
};

/**
 * Reads the attached CSV files that could be an ellipsometer fit export.
 *
 * @param datasets - The characterization's attached files.
 */
export const loadSeqfits = async (
  datasets: Dataset[]
): Promise<SeqfitFile[]> => {
  const candidates = datasets.filter(
    item =>
      item.fileName.toLowerCase().endsWith('.csv') &&
      item.fileName.toLowerCase() !== 'quantification.csv'
  );

  return Promise.all(
    candidates.map(async dataset => {
      const file = await datasetBytes(dataset.id);
      const parsed = file ? parseSeqfit(decode(file.bytes)) : null;

      return {
        datasetId: dataset.id,
        label: dataset.relativePath ?? dataset.fileName,
        summary: parsed?.isOk ? parsed.summary : null
      };
    })
  );
};

/**
 * Every number an analysis produces, computed from the raw files and the
 * settings. The server uses this to decide what to write, never numbers sent
 * by the browser.
 *
 * @param kind - Which analysis.
 * @param datasets - The characterization's attached files.
 * @param settings - The user's choices.
 * @returns The values, or null when there is nothing to compute them from.
 */
export const computeAnalysisValues = async (
  kind: AnalysisKind,
  datasets: Dataset[],
  settings: AnalysisSettings
): Promise<AnalysisValue[] | null> => {
  if (kind === 'edx') {
    const { spots } = await loadEdxSpots(datasets);
    const included = spots.filter(
      spot => !settings.excludedSpots.includes(spot.id)
    );

    return included.length === 0
      ? null
      : edxValues(included, settings.numerator, settings.denominator);
  }

  const files = await loadSeqfits(datasets);
  const chosen =
    files.find(file => file.datasetId === settings.datasetId && file.summary) ??
    files.find(file => file.summary);

  return chosen?.summary ? ellipsometryValues(chosen.summary) : null;
};
