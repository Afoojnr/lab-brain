import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';

import { listStudiesByExperiment } from '../data/studies';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { getProjectById } from '../data/projects';
import {
  listSampleCodesByProject,
  listSamplesByExperiment
} from '../data/samples';
import { getExperimentById } from '../data/experiments';
import {
  defaultSampleInputs,
  duplicateSampleInputs,
  suggestNextSampleCode
} from '../parameters';
import { SampleForm } from './sample-form';

type NewSampleProps = {
  projectId: string;
  experimentId: string;
  /** A sample in this experiment to copy from (the "Duplicate" action). */
  duplicateOfId?: string;
};

/**
 * The Add sample page. The code is suggested from the experiment prefix and values
 * are prefilled from the column defaults, else the previous sample. Duplicating
 * copies the values, date, studies and implementation of an existing sample under a new
 * code, but not its observation, which belongs to that sample.
 */
export const NewSample = async ({
  projectId,
  experimentId,
  duplicateOfId
}: NewSampleProps) => {
  const [t, tExperiments, project, experiment] = await Promise.all([
    getTranslations('samples'),
    getTranslations('experiments'),
    getProjectById(projectId),
    getExperimentById(experimentId)
  ]);
  if (!project || !experiment || experiment.projectId !== project.id)
    notFound();

  const [definitions, codes, samples, studies] = await Promise.all([
    listParameterDefinitions(experiment.id),
    listSampleCodesByProject(project.id),
    listSamplesByExperiment(experiment.id),
    listStudiesByExperiment(experiment.id)
  ]);
  const source = samples.find(sample => sample.id === duplicateOfId);
  const experimentPath = `/projects/${project.id}/experiments/${experiment.id}`;

  return (
    <FadeIn>
      <PageHeader
        title={
          source
            ? t('new.duplicateTitle', { code: source.code })
            : t('new.title')
        }
        description={
          source
            ? t('new.duplicateDescription', { code: source.code })
            : t('new.description')
        }
        breadcrumbs={[
          { label: tExperiments('project.breadcrumbDashboard'), href: '/' },
          { label: project.name, href: `/projects/${project.id}` },
          { label: experiment.name, href: experimentPath },
          { label: t('list.add') }
        ]}
      />
      <div className="mt-8">
        <SampleForm
          projectId={project.id}
          experimentId={experiment.id}
          definitions={definitions}
          studies={studies}
          otherCodes={codes}
          cancelHref={experimentPath}
          initial={{
            code: suggestNextSampleCode(experiment.codePrefix, codes),
            performedOn: source?.performedOn ?? '',
            values: source
              ? duplicateSampleInputs(definitions, source)
              : defaultSampleInputs(definitions, samples.at(-1)),
            studyIds: source?.studyIds ?? [],
            implementation: source?.implementation ?? '',
            observation: '',
            // A note explains that sample alone, so a copy starts without it.
            note: ''
          }}
        />
      </div>
    </FadeIn>
  );
};
