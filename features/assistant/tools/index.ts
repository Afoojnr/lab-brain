import { tool } from 'ai';
import { z } from 'zod';

import {
  listReferencesByProject,
  readReferenceText,
  readSlice
} from '@/features/references/server';

import { getExperimentOverview } from './overview';
import {
  clip,
  experimentSource,
  findSamples,
  getSample,
  MAX_TOOL_ROWS,
  searchNotes
} from './queries';
import {
  listExperimentsByProject,
  loadExperimentData,
  resolveExperiment,
  type ProjectScope
} from './load-experiment';

/** The most characters of a reference one readReference call returns. */
export const MAX_REFERENCE_SLICE = 6000;

const experimentField = z
  .string()
  .optional()
  .describe(
    'Experiment name or code prefix. Leave out for the experiment the chat is about.'
  );

const filterSchema = z.object({
  column: z
    .string()
    .describe('Column name, as listed by getExperimentOverview.'),
  operator: z.enum([
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'contains',
    'missing',
    'present'
  ]),
  value: z.union([z.string(), z.number()]).optional()
});

/**
 * The read-only tools the assistant may call. Each returns small, exact
 * results (capped rows, units, null for anything not recorded) and links to the
 * records it read, so an answer can cite them. None of them changes data.
 *
 * @param scope - The project (and optional experiment) the chat is about.
 */
export const createAssistantTools = (scope: ProjectScope) => ({
  listExperiments: tool({
    description:
      'List the experiments of this project with their code prefix and number of samples.',
    inputSchema: z.object({}),
    execute: async () => {
      const experiments = await listExperimentsByProject(scope.projectId);
      const loaded = await Promise.all(experiments.map(loadExperimentData));

      return {
        experiments: loaded.map(data => ({
          name: data.experiment.name,
          codePrefix: data.experiment.codePrefix,
          sampleCount: data.samples.length
        })),
        sources: experiments.map(item =>
          experimentSource(scope.projectId, item)
        )
      };
    }
  }),
  getExperimentOverview: tool({
    description:
      'Describe one experiment: protocol, columns with units, studies, which settings varied or stayed the same, and min/max/mean of each result. Start here before looking at samples.',
    inputSchema: z.object({ experiment: experimentField }),
    execute: async ({ experiment }) => {
      const data = await resolveExperiment(scope, experiment);

      return 'error' in data ? data : getExperimentOverview(data);
    }
  }),
  findSamples: tool({
    description: `Find samples of one experiment by filters on columns (all must match), optionally in a study, sorted. Returns at most ${MAX_TOOL_ROWS} rows; a value that was not recorded is null. Calculated columns can be filtered and sorted too.`,
    inputSchema: z.object({
      experiment: experimentField,
      filters: z.array(filterSchema).optional(),
      study: z.string().optional().describe('Study name.'),
      codeContains: z.string().optional(),
      sort: z
        .object({ column: z.string(), direction: z.enum(['asc', 'desc']) })
        .optional(),
      columns: z
        .array(z.string())
        .optional()
        .describe('Extra columns to show for each sample.'),
      limit: z.number().int().optional()
    }),
    execute: async ({ experiment, ...input }) => {
      const data = await resolveExperiment(scope, experiment);

      return 'error' in data ? data : findSamples(data, input);
    }
  }),
  getSample: tool({
    description:
      'Everything recorded about one sample: every column with its unit, notes, studies and measurements.',
    inputSchema: z.object({
      experiment: experimentField,
      code: z.string().describe('Sample code, e.g. ALD023.')
    }),
    execute: async ({ experiment, code }) => {
      const data = await resolveExperiment(scope, experiment);

      return 'error' in data ? data : getSample(data, code);
    }
  }),
  searchNotes: tool({
    description:
      "Search the text people wrote (a sample's implementation, observation and note, and the protocol) for a word or phrase. Returns short snippets.",
    inputSchema: z.object({
      experiment: experimentField,
      query: z.string(),
      limit: z.number().int().optional()
    }),
    execute: async ({ experiment, query, limit }) => {
      const data = await resolveExperiment(scope, experiment);

      return 'error' in data ? data : searchNotes(data, query, limit);
    }
  }),
  readReference: tool({
    description: `Read part of a reference (paper) added to the project, ${MAX_REFERENCE_SLICE} characters at a time, when its summary is not enough. A PDF's text has [Page N] marks.`,
    inputSchema: z.object({
      title: z.string().describe('The reference title, as in the list.'),
      from: z.number().int().min(0).optional().describe('First character.')
    }),
    execute: async ({ title, from }) => {
      const references = await listReferencesByProject(scope.projectId);
      const reference = references.find(
        item => item.title.trim().toLowerCase() === title.trim().toLowerCase()
      );
      if (!reference)
        return {
          error: `No reference titled "${title}".`,
          references: references.map(item => item.title)
        };

      const text = await readReferenceText(reference);
      if (text === null)
        return { error: `The text of "${reference.title}" is missing.` };

      const slice = readSlice(text, from ?? 0, MAX_REFERENCE_SLICE);

      return {
        title: reference.title,
        from: slice.from,
        totalCharacters: slice.totalCharacters,
        hasMore: slice.from + slice.text.length < slice.totalCharacters,
        text: slice.text,
        sources: [
          {
            label: clip(reference.title, 80),
            path: `/projects/${scope.projectId}?tab=references`
          }
        ]
      };
    }
  })
});

export type AssistantTools = ReturnType<typeof createAssistantTools>;
