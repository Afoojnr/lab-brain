import { DownloadIcon, FileTextIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { Markdown } from '@/components/markdown';
import { RecordDetail } from '@/components/record-detail';
import { buttonVariants } from '@/components/ui/button';

import { countExperiment } from '../cascade/count-records';
import { listCharacterizationsByExperiment } from '../data/characterizations';
import { listStudiesByExperiment } from '../data/studies';
import { listDerivedColumns } from '../data/derived-columns';
import { calculateForSamples } from '../calculations/derived-values';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { getProjectById } from '../data/projects';
import { isParameterInUse, listSamplesByExperiment } from '../data/samples';
import {
  getExperimentById,
  listExperimentsByProject
} from '../data/experiments';
import { filterSamples } from '../samples/sample-filter';
import { defaultSectionTab } from '../navigation/sections';
import type { SectionTab } from '../navigation/sections';
import { EditExperimentDialog } from './edit-experiment-dialog';
import { ExperimentMenu } from './experiment-menu';
import { ExperimentChecklist } from './experiment-checklist';
import { StudiesList } from './studies-list';
import { NewStudyDialog } from './new-study-dialog';
import { DerivedColumnDialog } from './derived-column-dialog';
import { DerivedColumnsTable } from './derived-columns-table';
import { ParameterDialog } from './parameter-dialog';
import { ParametersTable } from './parameters-table';
import { SamplesFilter } from './samples-filter';
import { SamplesTable } from './samples-table';
import { SectionTabs } from './section-tabs';
import { ExperimentTabs } from './experiment-tabs';

type ExperimentDetailProps = {
  projectId: string;
  experimentId: string;
  /** From the URL: show only samples of this study. */
  studyId?: string;
  /** Which section is shown, from the URL (`?tab=`). */
  tab?: SectionTab;
  /** The saved plots section, composed by the page (this feature cannot import the plots feature). */
  savedPlots?: ReactNode;
  /** How many saved plots there are, for the tab's count. */
  savedPlotCount?: number;
  /** From the URL: show only samples matching this text. */
  query?: string;
  /** Deletes the experiment (and what is in it); composed by the page, since other features hold data about it. */
  deleteExperiment?: (typedName: string) => Promise<boolean>;
};

/**
 * One experiment: its samples as a spreadsheet-like table, then its columns and
 * studies. Tabs above switch between the project's experiments.
 */
export const ExperimentDetail = async ({
  projectId,
  experimentId,
  studyId,
  tab,
  savedPlots,
  savedPlotCount = 0,
  query,
  deleteExperiment
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
  // Calculated values are worked out here for every sample, never stored; a
  // calculated column can use another one (see `derived-values.ts`).
  const derivedValues = calculateForSamples(
    definitions,
    derivedColumns,
    samples
  );
  // The form previews its formula on a few samples, with their calculated values
  // too, so a formula can be tried on another calculated column.
  const previewBase = allSamples
    .slice(0, 3)
    .map(({ id, code, values }) => ({ id, code, values }));
  const previewDerived = calculateForSamples(
    definitions,
    derivedColumns,
    previewBase
  );
  const previewSamples = previewBase.map(sample => ({
    ...sample,
    values: {
      ...sample.values,
      ...Object.fromEntries(
        Object.entries(previewDerived[sample.id] ?? {}).flatMap(
          ([id, value]) => (value === null ? [] : [[id, value]])
        )
      )
    }
  }));
  const derivedNames = derivedColumns.map(derived => derived.name);
  const experimentPath = `/projects/${project.id}/experiments/${experiment.id}`;
  const otherPrefixes = allExperiments
    .filter(other => other.id !== experiment.id)
    .map(other => other.codePrefix);

  const samplesPanel = {
    id: 'samples',
    title: tSamples('list.title'),
    content:
      allSamples.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {tSamples('list.empty')}
        </p>
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
            experimentName={experiment.name}
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
  };

  const plotsPanel = savedPlots
    ? {
        id: 'plots',
        title: t('savedPlots.title'),
        description: t('savedPlots.description'),
        actions: (
          <Link
            href={`/plots?source=experiment&project=${project.id}&experiment=${experiment.id}`}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm'
            })}
          >
            <PlusIcon aria-hidden />
            {t('savedPlots.new')}
          </Link>
        ),
        content: savedPlots
      }
    : undefined;

  const protocolPanel = {
    id: 'protocol',
    title: t('protocol.title'),
    description: t('protocol.description'),
    actions: (
      <EditExperimentDialog
        projectId={project.id}
        experiment={experiment}
        otherPrefixes={otherPrefixes}
        label={t(experiment.protocol ? 'protocol.edit' : 'protocol.add')}
        size="sm"
      />
    ),
    content: experiment.protocol ? (
      <div className="max-w-3xl text-sm">
        <Markdown>{experiment.protocol}</Markdown>
      </div>
    ) : (
      <p className="text-muted-foreground text-sm">{t('protocol.empty')}</p>
    )
  };

  const parametersPanel = {
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
  };

  const derivedPanel = {
    id: 'derived',
    title: tDerived('panel.title'),
    description: tDerived('panel.description'),
    actions: (
      <DerivedColumnDialog
        projectId={project.id}
        experimentId={experiment.id}
        columns={definitions}
        calculatedColumns={derivedColumns.map(item => ({
          id: item.id,
          name: item.name,
          kind: 'number' as const
        }))}
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
  };

  const studiesPanel = {
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
  };

  const defaultTab = defaultSectionTab(allSamples.length);
  const requestedTab = tab ?? defaultTab;
  const activeTab =
    requestedTab === 'plots' && !savedPlots ? defaultTab : requestedTab;
  const primaryByTab = {
    protocol: [protocolPanel],
    // The studies are a panel like the columns, with their button at the top right.
    setup: [parametersPanel, derivedPanel, studiesPanel],
    samples: [samplesPanel],
    plots: plotsPanel ? [plotsPanel] : [samplesPanel]
  };

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
            <Link
              href={`/report/projects/${project.id}/experiments/${experiment.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <FileTextIcon aria-hidden />
              {t('page.report')}
            </Link>
            <Link
              href={`/projects/${project.id}/import?experiment=${experiment.id}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <DownloadIcon aria-hidden />
              {tImport('experiment')}
            </Link>
            <Link
              href={`${experimentPath}/samples/new`}
              className={buttonVariants()}
            >
              <PlusIcon aria-hidden />
              {tSamples('list.add')}
            </Link>
            <ExperimentMenu
              projectId={project.id}
              experiment={experiment}
              otherPrefixes={otherPrefixes}
              details={
                deleteExperiment
                  ? {
                      kind: 'experiment',
                      counts: await countExperiment(experiment.id),
                      hasSavedData: true,
                      confirmName: experiment.name,
                      onDelete: deleteExperiment,
                      afterHref: `/projects/${project.id}`
                    }
                  : undefined
              }
            />
          </>
        }
        tabs={
          <>
            <SectionTabs
              experimentPath={experimentPath}
              active={activeTab}
              hasPlots={Boolean(savedPlots)}
              counts={{ samples: allSamples.length, plots: savedPlotCount }}
            />
            {/* A new experiment opens on Setup with its two steps: columns, then samples. */}
            {activeTab === 'setup' && allSamples.length === 0 && (
              <div className="mt-6">
                <ExperimentChecklist
                  projectId={project.id}
                  experimentId={experiment.id}
                  hasColumns={definitions.length > 0}
                />
              </div>
            )}
          </>
        }
        primary={primaryByTab[activeTab]}
        secondary={[]}
      />
    </>
  );
};
