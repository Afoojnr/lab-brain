import type { Sample } from './types';

export type SampleFilter = {
  /** Keep only samples tagged with this study. */
  studyId?: string;
  /** Keep only samples whose text contains this, ignoring case. */
  query?: string;
};

/**
 * The samples an experiment page shows for its study tag and search box. The
 * search looks in the code, implementation, observation and note, so a
 * remembered reason ("after reactor service") finds its sample.
 *
 * @param samples - The experiment's samples.
 * @param filter - The chosen tag and search text; both optional.
 * @returns The matching samples in their original order.
 */
export const filterSamples = (
  samples: Sample[],
  { studyId, query }: SampleFilter
): Sample[] => {
  const needle = query?.trim().toLowerCase() ?? '';

  return samples.filter(sample => {
    if (studyId && !sample.studyIds.includes(studyId)) {
      return false;
    }
    if (needle === '') return true;

    return [
      sample.code,
      sample.implementation,
      sample.observation,
      sample.note
    ].some(text => text?.toLowerCase().includes(needle));
  });
};
