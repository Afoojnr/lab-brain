import { PencilIcon, CopyIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';

import { RecordDetail } from '@/components/record-detail';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { listStudiesByExperiment } from '../data/studies';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { getProjectById } from '../data/projects';
import { getSampleById } from '../data/samples';
import { getExperimentById } from '../data/experiments';
import { CALENDAR_DATE_FORMAT, toCalendarDate } from '../parameters';
import { formatParameterValue } from './format-parameter-value';
import { RecordLink } from './record-link';

type SampleDetailProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
};

/**
 * One sample on the shared record layout: its implementation leads the page,
 * and its recorded values and observation are the main content.
 *
 * TODO: lineage (derived samples) and characterizations (next), then the notebook (a later feature).
 */
export const SampleDetail = async ({
  projectId,
  experimentId,
  sampleId
}: SampleDetailProps) => {
  const [t, tExperiments, format, project, experiment, sample] =
    await Promise.all([
      getTranslations('samples'),
      getTranslations('experiments'),
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

  const [definitions, studies] = await Promise.all([
    listParameterDefinitions(experiment.id),
    listStudiesByExperiment(experiment.id)
  ]);
  const sampleStudies = studies.filter(study =>
    sample.studyIds.includes(study.id)
  );
  const experimentPath = `/projects/${project.id}/experiments/${experiment.id}`;
  const samplePath = `${experimentPath}/samples/${sample.id}`;

  return (
    <RecordDetail
      breadcrumbs={[
        { label: tExperiments('project.breadcrumbDashboard'), href: '/' },
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
            definitions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('detail.parameters.name')}</TableHead>
                    <TableHead>{t('detail.parameters.value')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {definitions.map(definition => {
                    const value = sample.values[definition.id];

                    return (
                      <TableRow key={definition.id}>
                        <TableCell className="font-medium">
                          {definition.name}
                        </TableCell>
                        <TableCell>
                          {value === undefined ? (
                            <span className="text-muted-foreground">
                              {t('detail.parameters.notRecorded')}
                            </span>
                          ) : (
                            `${formatParameterValue(format, value)}${definition.unit ? ` ${definition.unit}` : ''}`
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t('detail.parameters.empty')}
              </p>
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
