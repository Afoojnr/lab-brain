import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';

import { RecordDetail } from '@/components/record-detail';
import { buttonVariants } from '@/components/ui/button';
import { AttachFilesDialog, DatasetList } from '@/features/experiments';
import {
  getCharacterizationOfSample,
  getExperimentInProject,
  getProjectById,
  getSampleById,
  listCharacterizationsByExperiment,
  listDatasetsByCharacterization,
  listParameterDefinitions
} from '@/features/experiments/server';

import { getAnalysis, latestTargets } from '../data/analyses';
import { defaultSettings, suggestKind } from '../defaults';
import { loadEdxSpots, loadSeqfits } from '../load';
import { analysisKindSchema } from '../schemas';
import type { AnalysisKind, AnalysisSettings } from '../types';
import { EdxAnalysis } from './edx-analysis';
import { EllipsometryAnalysis } from './ellipsometry-analysis';

type CharacterizationPageProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterizationId: string;
  /** From the URL: analyse as this kind, whatever the technique is called. */
  analysis?: string;
};

/**
 * One characterization of a sample: its files, and the analysis that turns
 * them into numbers for the sample's result columns. The analysis is chosen
 * from the technique's name (or the URL) and always computed from the raw files.
 */
export const CharacterizationPage = async ({
  projectId,
  experimentId,
  sampleId,
  characterizationId,
  analysis
}: CharacterizationPageProps) => {
  const [t, project, experiment, sample, characterization] = await Promise.all([
    getTranslations('analysis'),
    getProjectById(projectId),
    getExperimentInProject(projectId, experimentId),
    getSampleById(sampleId),
    getCharacterizationOfSample(sampleId, characterizationId)
  ]);
  if (
    !project ||
    !experiment ||
    sample?.experimentId !== experiment.id ||
    !characterization
  ) {
    notFound();
  }

  const [datasets, definitions, format] = await Promise.all([
    listDatasetsByCharacterization(characterization.id),
    listParameterDefinitions(experiment.id),
    getFormatter()
  ]);
  const requested = analysisKindSchema.safeParse(analysis);
  const kind: AnalysisKind | null = requested.success
    ? requested.data
    : suggestKind(characterization.technique);
  const columns = definitions
    .filter(column => column.role === 'result' && column.kind === 'number')
    .map(column => ({ id: column.id, name: column.name, unit: column.unit }));
  const base = `/projects/${project.id}/experiments/${experiment.id}`;
  const ids = {
    projectId: project.id,
    experimentId: experiment.id,
    sampleId: sample.id,
    characterizationId: characterization.id
  };

  // Saved choices, else the defaults with the columns the last analysis of this kind used.
  const initialSettings = async (
    analysisKind: AnalysisKind
  ): Promise<AnalysisSettings> => {
    const saved = await getAnalysis(characterization.id, analysisKind);
    if (saved) return saved.settings;

    const siblings = await listCharacterizationsByExperiment(experiment.id);
    return {
      ...defaultSettings(analysisKind),
      targets: await latestTargets(
        siblings.map(item => item.id),
        analysisKind
      )
    };
  };

  const analysisContent = async () => {
    if (kind === 'edx') {
      const { spots, problems } = await loadEdxSpots(datasets);

      return (
        <EdxAnalysis
          ids={ids}
          spots={spots}
          problems={problems}
          initialSettings={await initialSettings('edx')}
          columns={columns}
          currentValues={sample.values}
        />
      );
    }
    if (kind === 'ellipsometry') {
      return (
        <EllipsometryAnalysis
          ids={ids}
          files={await loadSeqfits(datasets)}
          initialSettings={await initialSettings('ellipsometry')}
          columns={columns}
          currentValues={sample.values}
        />
      );
    }

    return (
      <div className="grid gap-3">
        <p className="font-medium">{t('chooser.title')}</p>
        <p className="text-muted-foreground text-sm">
          {t('chooser.description')}
        </p>
        <div className="flex flex-wrap gap-2">
          {(['edx', 'ellipsometry'] as const).map(option => (
            <Link
              key={option}
              href={`${base}/samples/${sample.id}/characterizations/${characterization.id}?analysis=${option}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              {t(`chooser.${option}`)}
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <RecordDetail
      breadcrumbs={[
        { label: t('page.breadcrumbProjects'), href: '/' },
        { label: project.name, href: `/projects/${project.id}` },
        { label: experiment.name, href: base },
        { label: sample.code, href: `${base}/samples/${sample.id}` },
        { label: characterization.technique }
      ]}
      title={characterization.technique}
      lead={characterization.note ?? undefined}
      facts={[
        { label: t('page.factSample'), value: sample.code },
        {
          label: t('page.factDate'),
          value: characterization.measuredOn
            ? format.dateTime(
                new Date(`${characterization.measuredOn}T00:00:00Z`),
                {
                  dateStyle: 'medium',
                  timeZone: 'UTC'
                }
              )
            : t('page.noDate')
        }
      ]}
      actions={
        <>
          <Link
            href={`${base}/samples/${sample.id}`}
            className={buttonVariants({ variant: 'outline' })}
          >
            {t('page.backToSample')}
          </Link>
          <AttachFilesDialog
            projectId={project.id}
            experimentId={experiment.id}
            sampleId={sample.id}
            characterization={characterization}
          />
        </>
      }
      primary={[
        {
          id: 'files',
          title: t('page.filesTitle'),
          description: t('page.filesDescription'),
          content:
            datasets.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t('page.noFiles')}
              </p>
            ) : (
              <DatasetList {...ids} datasets={datasets} />
            )
        },
        {
          id: 'analysis',
          title: t('page.analysisTitle'),
          description: t('page.analysisDescription'),
          content: await analysisContent()
        }
      ]}
      secondary={[]}
      secondaryPlacement="below"
    />
  );
};
