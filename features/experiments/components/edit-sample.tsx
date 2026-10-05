import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';

import { listStudiesByExperiment } from '../data/studies';
import { listParameterDefinitions } from '../data/parameter-definitions';
import { getProjectById } from '../data/projects';
import { getSampleById, listSampleCodesByProject } from '../data/samples';
import { getExperimentById } from '../data/experiments';
import { sampleToInputs } from '../parameters';
import { SampleForm } from './sample-form';

type EditSampleProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
};

/** The Edit sample page. The sample's own current code does not count as a duplicate. */
export const EditSample = async ({
  projectId,
  experimentId,
  sampleId
}: EditSampleProps) => {
  const [t, tExperiments, project, experiment, sample] = await Promise.all([
    getTranslations('samples'),
    getTranslations('experiments'),
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

  const [definitions, codes, studies] = await Promise.all([
    listParameterDefinitions(experiment.id),
    listSampleCodesByProject(project.id),
    listStudiesByExperiment(experiment.id)
  ]);
  const experimentPath = `/projects/${project.id}/experiments/${experiment.id}`;
  const samplePath = `${experimentPath}/samples/${sample.id}`;

  return (
    <FadeIn>
      <PageHeader
        title={t('edit.title', { code: sample.code })}
        description={t('edit.description')}
        breadcrumbs={[
          { label: tExperiments('project.breadcrumbDashboard'), href: '/' },
          { label: project.name, href: `/projects/${project.id}` },
          { label: experiment.name, href: experimentPath },
          { label: sample.code, href: samplePath },
          { label: t('detail.edit') }
        ]}
      />
      <div className="mt-8">
        <SampleForm
          projectId={project.id}
          experimentId={experiment.id}
          sampleId={sample.id}
          definitions={definitions}
          studies={studies}
          otherCodes={codes.filter(
            code => code.toLowerCase() !== sample.code.toLowerCase()
          )}
          cancelHref={samplePath}
          initial={{
            code: sample.code,
            performedOn: sample.performedOn ?? '',
            values: sampleToInputs(definitions, sample),
            studyIds: sample.studyIds,
            implementation: sample.implementation ?? '',
            observation: sample.observation ?? '',
            note: sample.note ?? ''
          }}
        />
      </div>
    </FadeIn>
  );
};
