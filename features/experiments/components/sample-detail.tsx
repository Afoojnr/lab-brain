import { PencilIcon, CopyIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';

import { RecordDetail } from '@/components/record-detail';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import {
  listCharacterizationsBySample,
  listTechniquesByProject
} from '../data/characterizations';
import { listDerivedColumns } from '../data/derived-columns';
import { listDatasetsBySample } from '../data/datasets';
import { listStudiesByExperiment } from '../data/studies';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { getProjectById } from '../data/projects';
import { getSampleById } from '../data/samples';
import { getExperimentById } from '../data/experiments';
import { CALENDAR_DATE_FORMAT, toCalendarDate } from '../parameters';
import { CharacterizationDialog } from './characterization-dialog';
import { CharacterizationsTable } from './characterizations-table';
import { RecordLink } from './record-link';
import { DerivedValuesTable } from './derived-values-table';
import { SampleValuesTable } from './sample-values-table';

type SampleDetailProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
};

/**
 * One sample on the shared record layout: its implementation leads the page,
 * and its recorded values and observation are the main content.
 *
 * TODO: the notebook (a later feature).
 */
export const SampleDetail = async ({
  projectId,
  experimentId,
  sampleId
}: SampleDetailProps) => {
  const [
    t,
    tExperiments,
    tCharacterizations,
    tDerived,
    format,
    project,
    experiment,
    sample
  ] = await Promise.all([
    getTranslations('samples'),
    getTranslations('experiments'),
    getTranslations('characterizations'),
    getTranslations('derived'),
    getFormatter(),
    getProjectById(projectId),
    getExperimentById(experimentId),
    getSampleById(sampleId)
  ]);
  if (
    !project ||
    !experiment ||
    experiment.projectId !== project.id ||
    !sample ||
    sample.experimentId !== experiment.id
  ) {
    notFound();
  }

  const [
    definitions,
    derivedColumns,
    studies,
    characterizations,
    datasets,
    knownTechniques
  ] = await Promise.all([
    listParameterDefinitions(experiment.id),
    listDerivedColumns(experiment.id),
    listStudiesByExperiment(experiment.id),
    listCharacterizationsBySample(sample.id),
    listDatasetsBySample(sample.id),
    listTechniquesByProject(project.id)
  ]);
  const parameters = definitions.filter(
    definition => definition.role === 'parameter'
  );
  const results = definitions.filter(
    definition => definition.role === 'result'
  );
  const sampleStudies = studies.filter(study =>
    sample.studyIds.includes(study.id)
  );
  const experimentPath = `/projects/${project.id}/experiments/${experiment.id}`;
  const samplePath = `${experimentPath}/samples/${sample.id}`;

  return (
    <RecordDetail
      breadcrumbs={[
        { label: tExperiments('project.breadcrumbProjects'), href: '/' },
        { label: project.name, href: `/projects/${project.id}` },
        { label: experiment.name, href: experimentPath },
        { label: sample.code }
      ]}
      title={sample.code}
      lead={sample.implementation ?? undefined}
      facts={[
        {
          label: t('detail.facts.experiment'),
          value: (
            <RecordLink href={experimentPath}>
              {experiment.codePrefix}
            </RecordLink>
          )
        },
        ...(sampleStudies.length > 0
          ? [
              {
                label: t('detail.facts.studies'),
                value: (
                  <span className="flex flex-wrap gap-1">
                    {sampleStudies.map(study => (
                      <Badge key={study.id} variant="secondary">
                        {study.name}
                      </Badge>
                    ))}
                  </span>
                )
              }
            ]
          : []),
        ...(sample.performedOn
          ? [
              {
                label: t('detail.facts.date'),
                value: format.dateTime(
                  toCalendarDate(sample.performedOn),
                  CALENDAR_DATE_FORMAT
                )
              }
            ]
          : [])
      ]}
      actions={
        <>
          <Link
            href={`${experimentPath}/samples/new?duplicateOf=${sample.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            <CopyIcon aria-hidden />
            {t('detail.duplicate')}
          </Link>
          <Link href={`${samplePath}/edit`} className={buttonVariants()}>
            <PencilIcon aria-hidden />
            {t('detail.edit')}
          </Link>
        </>
      }
      primary={[
        {
          title: t('detail.parameters.title'),
          content:
            parameters.length > 0 ? (
              <SampleValuesTable definitions={parameters} sample={sample} />
            ) : (
              <p className="text-muted-foreground text-sm">
                {t('detail.parameters.empty')}
              </p>
            )
        },
        ...(results.length > 0
          ? [
              {
                title: t('detail.results.title'),
                content: (
                  <SampleValuesTable definitions={results} sample={sample} />
                )
              }
            ]
          : []),
        ...(derivedColumns.length > 0
          ? [
              {
                title: tDerived('sample.title'),
                description: tDerived('sample.description'),
                content: (
                  <DerivedValuesTable
                    derivedColumns={derivedColumns}
                    columns={definitions}
                    sample={sample}
                  />
                )
              }
            ]
          : []),
        {
          title: tCharacterizations('panel.title'),
          description: tCharacterizations('panel.description'),
          actions: (
            <CharacterizationDialog
              projectId={project.id}
              experimentId={experiment.id}
              sampleId={sample.id}
              knownTechniques={knownTechniques}
            />
          ),
          content: (
            <CharacterizationsTable
              projectId={project.id}
              experimentId={experiment.id}
              sampleId={sample.id}
              characterizations={characterizations}
              datasets={datasets}
              knownTechniques={knownTechniques}
            />
          )
        },
        {
          title: t('detail.observation.title'),
          content: sample.observation ? (
            <p className="text-sm whitespace-pre-wrap">{sample.observation}</p>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t('detail.observation.empty')}
            </p>
          )
        },
        ...(sample.note
          ? [
              {
                title: t('detail.note.title'),
                content: (
                  <p className="text-sm whitespace-pre-wrap">{sample.note}</p>
                )
              }
            ]
          : [])
      ]}
      secondary={[
        {
          title: t('detail.notebook.title'),
          content: (
            <p className="text-muted-foreground text-sm">
              {t('detail.notebook.placeholder')}
            </p>
          )
        }
      ]}
    />
  );
};
