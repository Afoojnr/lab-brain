import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { FadeIn } from '@/components/motion/fade-in';
import { PageHeader } from '@/components/page-header';
import {
  getProjectById,
  listExperimentsByProject,
  listParameterDefinitions,
  listSamplesByExperiment,
  listStudiesByExperiment
} from '@/features/experiments/server';

import type { ValidationContext } from '../validation-types';
import { ImportWizard } from './import-wizard';

type ImportPageProps = {
  projectId: string;
  /** From the URL: start with this experiment as the target. */
  experimentId?: string;
};

/** The import page: loads what the project holds so the preview can check codes and columns in the browser. */
export const ImportPage = async ({
  projectId,
  experimentId
}: ImportPageProps) => {
  const [t, project] = await Promise.all([
    getTranslations('import.page'),
    getProjectById(projectId)
  ]);
  if (!project) notFound();

  const experiments = await listExperimentsByProject(project.id);
  const loaded = await Promise.all(
    experiments.map(async experiment => {
      const [columns, studies, samples] = await Promise.all([
        listParameterDefinitions(experiment.id),
        listStudiesByExperiment(experiment.id),
        listSamplesByExperiment(experiment.id)
      ]);

      return { experiment, columns, studies, samples };
    })
  );
  const otherPrefixes = experiments.map(experiment => experiment.codePrefix);
  const existing: Record<string, ValidationContext> = Object.fromEntries(
    loaded.map(({ experiment, columns, studies, samples }) => [
      experiment.id,
      {
        otherPrefixes,
        columns,
        studies,
        experimentSamples: samples,
        otherCodes: loaded
          .filter(other => other.experiment.id !== experiment.id)
          .flatMap(other => other.samples.map(sample => sample.code))
      }
    ])
  );

  return (
    <FadeIn>
      <PageHeader
        title={t('title')}
        description={t('description')}
        breadcrumbs={[
          { label: t('breadcrumbProjects'), href: '/' },
          { label: project.name, href: `/projects/${project.id}` },
          { label: t('title') }
        ]}
      />
      <div className="mt-8">
        <ImportWizard
          projectId={project.id}
          preselectedExperimentId={experimentId}
          data={{
            experiments: experiments.map(experiment => ({
              id: experiment.id,
              name: experiment.name,
              codePrefix: experiment.codePrefix
            })),
            newExperiment: {
              otherPrefixes,
              columns: [],
              studies: [],
              experimentSamples: [],
              otherCodes: loaded.flatMap(item =>
                item.samples.map(sample => sample.code)
              )
            },
            existing
          }}
        />
      </div>
    </FadeIn>
  );
};
