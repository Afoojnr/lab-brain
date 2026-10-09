import { PlusIcon, UploadIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { RecordDetail } from '@/components/record-detail';
import { buttonVariants } from '@/components/ui/button';

import { listCharacterizationsByExperiment } from '../data/characterizations';
import { listStudiesByExperiment } from '../data/studies';
import { listDerivedColumns } from '../data/derived-columns';
import { evaluateFormula, parseFormula } from '../formula';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { getProjectById } from '../data/projects';
import { isParameterInUse, listSamplesByExperiment } from '../data/samples';
import {
  getExperimentById,
  listExperimentsByProject
} from '../data/experiments';
import { filterSamples } from '../sample-filter';
import { EditExperimentDialog } from './edit-experiment-dialog';
import { ExperimentChecklist } from './experiment-checklist';
import { StudiesList } from './studies-list';
import { NewStudyDialog } from './new-study-dialog';
import { DerivedColumnDialog } from './derived-column-dialog';
import { DerivedColumnsTable } from './derived-columns-table';
import { ParameterDialog } from './parameter-dialog';
import { ParametersTable } from './parameters-table';
import { SamplesFilter } from './samples-filter';
import { SamplesTable } from './samples-table';
import { ExperimentTabs } from './experiment-tabs';

type ExperimentDetailProps = {
  projectId: string;
  experimentId: string;
  /** From the URL: show only samples of this study. */
  studyId?: string;
  /** From the URL: show only samples matching this text. */
  query?: string;
};

/**
 * One experiment: its samples as a spreadsheet-like table, then its columns and
 * studies. Tabs above switch between the project's experiments.
 */
export const ExperimentDetail = async ({
  projectId,
  experimentId,
  studyId,
  query
}: ExperimentDetailProps) => {
  const [
    t,
    tImport,
    tSamples,
    tParameters,
    tDerived,
    tStudies,
    project,
    experiment
  ] = await Promise.all([
    getTranslations('experiments'),
    getTranslations('import.entry'),
    getTranslations('samples'),
    getTranslations('parameters'),
    getTranslations('derived'),
    getTranslations('studies'),
    getProjectById(projectId),
    getExperimentById(experimentId)
  ]);
  if (!project || !experiment || experiment.projectId !== project.id)
    notFound();

  const [allExperiments, definitions, allSamples, studies, characterizations] =
    await Promise.all([
      listExperimentsByProject(project.id),
      listParameterDefinitions(experiment.id),
      listSamplesByExperiment(experiment.id),
      listStudiesByExperiment(experiment.id),
      listCharacterizationsByExperiment(experiment.id)
    ]);
  // A study id from the URL that is not in this experiment is ignored.
  const activeStudyId = studies.find(study => study.id === studyId)?.id;
  const samples = filterSamples(allSamples, {
    studyId: activeStudyId,
    query
  });
  const sampleCounts = Object.fromEntries(
    studies.map(study => [
      study.id,
      allSamples.filter(sample => sample.studyIds.includes(study.id)).length
    ])
  );
  const derivedColumns = await listDerivedColumns(experiment.id);
  const usedFlags = await Promise.all(
    definitions.map(definition => isParameterInUse(definition.id))
  );
  // Used by samples, or by a calculated column's formula: neither can be deleted.
  const usedIds = definitions
    .filter(
      (definition, index) =>
        usedFlags[index] ||
        derivedColumns.some(derived =>
          derived.formula.includes(`[#${definition.id}]`)
        )
    )
    .map(definition => definition.id);
  // Calculated values are worked out here for every sample, never stored.
  const parsedFormulas = derivedColumns.map(derived => ({
    derived,
    parsed: parseFormula(derived.formula, definitions)
  }));
  const derivedValues = Object.fromEntries(
    samples.map(sample => [
      sample.id,
      Object.fromEntries(
        parsedFormulas.map(({ derived, parsed }) => [
          derived.id,
          parsed.isOk ? evaluateFormula(parsed.ast, sample.values) : null
        ])
      )
    ])
  );
  const previewSamples = allSamples
    .slice(0, 3)
    .map(({ id, code, values }) => ({ id, code, values }));
  const derivedNames = derivedColumns.map(derived => derived.name);
  const experimentPath = `/projects/${project.id}/experiments/${experiment.id}`;

  return (
    <>
      <ExperimentTabs
        projectId={project.id}
        experiments={allExperiments}
        currentExperimentId={experiment.id}
      />
      <RecordDetail
        breadcrumbs={[
          { label: t('project.breadcrumbProjects'), href: '/' },
          { label: project.name, href: `/projects/${project.id}` },
          { label: experiment.name }
        ]}
        title={experiment.name}
        lead={experiment.protocol ?? undefined}
        facts={[
          { label: t('page.facts.project'), value: project.name },
          {
            label: t('page.facts.prefix'),
            value: <span className="font-mono">{experiment.codePrefix}</span>
          },
          { label: t('page.facts.samples'), value: allSamples.length }
        ]}
        actions={
          <>
            <EditExperimentDialog
              projectId={project.id}
              experiment={experiment}
              otherPrefixes={allExperiments
                .filter(other => other.id !== experiment.id)
                .map(other => other.codePrefix)}
            />
            <Link
              href={`/projects/${project.id}/import?experiment=${experiment.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <UploadIcon aria-hidden />
              {tImport('experiment')}
            </Link>
            <Link
              href={`${experimentPath}/samples/new`}
              className={buttonVariants()}
            >
              <PlusIcon aria-hidden />
              {tSamples('list.add')}
            </Link>
          </>
        }
        primary={[
          {
            id: 'samples',
            title: tSamples('list.title'),
            content:
              allSamples.length === 0 ? (
                <ExperimentChecklist
                  projectId={project.id}
                  experimentId={experiment.id}
                  hasColumns={definitions.length > 0}
                />
              ) : (
                <>
                  <SamplesFilter
                    experimentPath={experimentPath}
                    studies={studies}
                    studyId={activeStudyId}
                    query={query}
                  />
                  <SamplesTable
                    projectId={project.id}
                    experimentId={experiment.id}
                    definitions={definitions}
                    samples={samples}
                    studies={studies}
                    characterizations={characterizations}
                    derivedColumns={derivedColumns}
                    derivedValues={derivedValues}
                    isFiltered={Boolean(activeStudyId ?? query)}
                  />
                </>
              )
          },
          {
            id: 'parameters',
            title: tParameters('panel.title'),
            description: tParameters('panel.description'),
            actions: (
              <ParameterDialog
                projectId={project.id}
                experimentId={experiment.id}
                otherNames={definitions.map(definition => definition.name)}
              />
            ),
            content: (
              <ParametersTable
                projectId={project.id}
                experimentId={experiment.id}
                definitions={definitions}
                usedIds={usedIds}
              />
            )
          },
          {
            id: 'derived',
            title: tDerived('panel.title'),
            description: tDerived('panel.description'),
            actions: (
              <DerivedColumnDialog
                projectId={project.id}
                experimentId={experiment.id}
                columns={definitions}
                otherNames={[
                  ...definitions.map(definition => definition.name),
                  ...derivedNames
                ]}
                previewSamples={previewSamples}
              />
            ),
            content: (
              <DerivedColumnsTable
                projectId={project.id}
                experimentId={experiment.id}
                columns={definitions}
                derivedColumns={derivedColumns}
                previewSamples={previewSamples}
              />
            )
          }
        ]}
        secondary={[
          {
            id: 'studies',
            title: tStudies('panel.title'),
            description: tStudies('panel.description'),
            actions: (
              <NewStudyDialog
                projectId={project.id}
                experimentId={experiment.id}
                otherNames={studies.map(study => study.name)}
              />
            ),
            content: (
              <StudiesList
                projectId={project.id}
                experimentId={experiment.id}
                experimentPath={experimentPath}
                studies={studies}
                sampleCounts={sampleCounts}
              />
            )
          }
        ]}
        secondaryPlacement="below"
      />
    </>
  );
};
