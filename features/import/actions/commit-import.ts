'use server';

import { revalidatePath } from 'next/cache';

import {
  createExperiment,
  createParameterDefinition,
  createSample,
  createStudy,
  getExperimentInProject,
  getProjectById,
  listExperimentsByProject,
  listParameterDefinitions,
  listSamplesByExperiment,
  listStudiesByExperiment,
  updateSample
} from '@/features/experiments/server';

import { importPayloadSchema } from '../schemas';
import type { ImportPayload } from '../types';
import { validateImport } from '../validate';
import type { ImportReport, ValidationContext } from '../validation-types';

export type CommitImportResult =
  | {
      isOk: true;
      created: number;
      updated: number;
      skipped: number;
      experimentId: string;
    }
  | { isOk: false; report: ImportReport };

/** What the project already holds, read fresh from storage for this import. */
const loadContext = async (
  projectId: string,
  payload: ImportPayload
): Promise<ValidationContext | null> => {
  const experiments = await listExperimentsByProject(projectId);
  const targetId =
    payload.target.type === 'existing' ? payload.target.experimentId : null;
  if (targetId && !(await getExperimentInProject(projectId, targetId))) {
    return null;
  }

  const [columns, studies, experimentSamples] = targetId
    ? await Promise.all([
        listParameterDefinitions(targetId),
        listStudiesByExperiment(targetId),
        listSamplesByExperiment(targetId)
      ])
    : [[], [], []];
  const otherSamples = await Promise.all(
    experiments
      .filter(experiment => experiment.id !== targetId)
      .map(experiment => listSamplesByExperiment(experiment.id))
  );

  return {
    otherPrefixes: experiments.map(experiment => experiment.codePrefix),
    columns,
    studies,
    experimentSamples,
    otherCodes: otherSamples.flat().map(sample => sample.code)
  };
};

/**
 * Applies an import. Nothing from the browser is trusted: the payload's shape is
 * checked, the project and experiment are looked up, and the whole import is
 * validated again against what is stored now. If anything changed since the
 * preview (a code taken in the meantime, for example) or anything is invalid,
 * it writes nothing and returns the fresh report.
 *
 * TODO(Step 6): run the writes in one database transaction.
 *
 * @param projectId - Owning project's id.
 * @param input - The import (see `importPayloadSchema`).
 * @returns What was written, the fresh report when it was refused, or null when ignored.
 */
export const commitImportAction = async (
  projectId: string,
  input: unknown
): Promise<CommitImportResult | null> => {
  if (!(await getProjectById(projectId))) return null;

  const parsed = importPayloadSchema.safeParse(input);
  if (!parsed.success) return null;
  const payload: ImportPayload = parsed.data;

  const context = await loadContext(projectId, payload);
  if (!context) return null;

  const report = validateImport(payload, context);
  if (!report.isReady) return { isOk: false, report };

  const experimentId =
    payload.target.type === 'existing'
      ? payload.target.experimentId
      : (
          await createExperiment(projectId, {
            name: payload.target.name.trim(),
            codePrefix: payload.target.codePrefix.trim(),
            protocol: payload.target.protocol.trim()
          })
        ).id;

  const columnIds = new Map<string, string>();
  for (const column of report.newColumns) {
    const stored = await createParameterDefinition(experimentId, {
      name: column.name,
      unit: column.unit ?? '',
      kind: column.kind,
      role: column.role,
      defaultValue: null
    });
    columnIds.set(column.id, stored.id);
  }

  const studyIds = new Map(
    context.studies.map(study => [study.name.toLowerCase(), study.id])
  );
  for (const name of report.newStudyNames) {
    const stored = await createStudy(experimentId, { name, description: '' });
    studyIds.set(name.toLowerCase(), stored.id);
  }

  let created = 0;
  let updated = 0;
  for (const planned of report.planned) {
    const existing = context.experimentSamples.find(
      sample => sample.id === planned.existingId
    );
    const input = {
      code: planned.code,
      performedOn: planned.performedOn,
      values: Object.fromEntries(
        Object.entries(planned.values).map(([key, value]) => [
          columnIds.get(key) ?? key,
          value
        ])
      ),
      studyIds: [
        ...new Set([
          ...(existing?.studyIds ?? []),
          ...planned.studyNames.flatMap(name => {
            const id = studyIds.get(name.toLowerCase());
            return id ? [id] : [];
          })
        ])
      ],
      implementation: planned.implementation,
      observation: planned.observation,
      note: planned.note
    };

    if (existing) {
      await updateSample(experimentId, existing.id, input);
      updated += 1;
    } else {
      await createSample(experimentId, input);
      created += 1;
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/experiments/${experimentId}`);

  return {
    isOk: true,
    created,
    updated,
    skipped: report.counts.skipped,
    experimentId
  };
};
