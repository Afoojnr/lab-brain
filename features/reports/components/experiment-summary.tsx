import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  getExperimentInProject,
  getProjectById,
  listDerivedColumns,
  listParameterDefinitions,
  listSamplesByExperiment,
  listStudiesByExperiment
} from '@/features/experiments/server';
import { evaluateFormula, parseFormula } from '@/features/experiments/shared';
import { SavedPlotsReport } from '@/features/plots';

import { calculatedText, valueText } from '../format';
import { summarizeExperiment } from '../summary';
import { ReportShell } from './report-shell';
import { ReportTable } from './report-table';

/** A list of values is written out up to this many; more than that is counted instead. */
const MAX_LISTED_VALUES = 8;

const unitSuffix = (unit: string | null) => (unit ? ` (${unit})` : '');

/**
 * One page that says what an experiment is about instead of repeating its
 * table: what varied between samples and over what, what stayed the same, how
 * each result came out, the studies, the protocol and the saved plots. The
 * full table leaves the app as Excel, from the samples table.
 */
export const ExperimentSummary = async ({
  projectId,
  experimentId
}: {
  projectId: string;
  experimentId: string;
}) => {
  const [project, experiment] = await Promise.all([
    getProjectById(projectId),
    getExperimentInProject(projectId, experimentId)
  ]);
  if (!project || !experiment) notFound();

  const [
    t,
    tColumns,
    tReports,
    format,
    definitions,
    derivedColumns,
    samples,
    studies
  ] = await Promise.all([
    getTranslations('reports.experiment'),
    getTranslations('reports.summary'),
    getTranslations('reports'),
    getFormatter(),
    listParameterDefinitions(experiment.id),
    listDerivedColumns(experiment.id),
    listSamplesByExperiment(experiment.id),
    listStudiesByExperiment(experiment.id)
  ]);
  const notRecorded = tReports('notRecorded');
  const derivedValues = Object.fromEntries(
    samples.map(sample => [
      sample.id,
      Object.fromEntries(
        derivedColumns.map(derived => {
          const parsed = parseFormula(derived.formula, definitions);

          return [
            derived.id,
            parsed.isOk ? evaluateFormula(parsed.ast, sample.values) : null
          ];
        })
      )
    ])
  );
  const summary = summarizeExperiment({
    definitions,
    derivedColumns,
    derivedValues,
    samples
  });
  const number = (value: number | null) =>
    calculatedText(format, value, notRecorded);

  return (
    <ReportShell
      kind="experiment"
      title={experiment.name}
      subtitle={`${project.name} · ${t('prefix', { prefix: experiment.codePrefix })} · ${t('sampleCount', { count: samples.length })}`}
      backHref={`/projects/${project.id}/experiments/${experiment.id}`}
      orientation="portrait"
    >
      {experiment.protocol && (
        <div className="report-block">
          <h2 className="mb-2 text-lg font-semibold">{t('protocol')}</h2>
          <p className="text-sm whitespace-pre-wrap">{experiment.protocol}</p>
        </div>
      )}

      <div>
        <h2 className="mb-1 text-lg font-semibold">
          {tColumns('variedTitle')}
        </h2>
        <p className="text-muted-foreground mb-3 text-sm">
          {tColumns('variedHint')}
        </p>
        {summary.varied.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {tColumns('noVaried')}
          </p>
        ) : (
          <ReportTable
            headers={[
              tColumns('column'),
              tColumns('values'),
              tColumns('range'),
              tColumns('recorded')
            ]}
            rows={summary.varied.map(item => [
              `${item.name}${unitSuffix(item.unit)}`,
              item.values.length <= MAX_LISTED_VALUES
                ? item.values
                    .map(value => valueText(format, value, notRecorded))
                    .join(', ')
                : tColumns('manyValues', { count: item.values.length }),
              item.min !== null && item.max !== null
                ? `${number(item.min)} – ${number(item.max)}`
                : '',
              tColumns('recordedOf', {
                count: item.recorded,
                total: summary.sampleCount
              })
            ])}
          />
        )}
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold">
          {tColumns('constantTitle')}
        </h2>
        <p className="text-muted-foreground mb-3 text-sm">
          {tColumns('constantHint')}
        </p>
        {summary.constant.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {tColumns('noConstant')}
          </p>
        ) : (
          <ReportTable
            headers={[
              tColumns('column'),
              tColumns('value'),
              tColumns('recorded')
            ]}
            rows={summary.constant.map(item => [
              `${item.name}${unitSuffix(item.unit)}`,
              valueText(format, item.value, notRecorded),
              tColumns('recordedOf', {
                count: item.recorded,
                total: summary.sampleCount
              })
            ])}
          />
        )}
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold">
          {tColumns('resultsTitle')}
        </h2>
        <p className="text-muted-foreground mb-3 text-sm">
          {tColumns('resultsHint')}
        </p>
        {summary.results.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {tColumns('noResults')}
          </p>
        ) : (
          <ReportTable
            headers={[
              tColumns('column'),
              tColumns('measured'),
              tColumns('min'),
              tColumns('max'),
              tColumns('mean'),
              tColumns('sd')
            ]}
            rows={summary.results.map(item => [
              `${item.name}${unitSuffix(item.unit)}`,
              tColumns('recordedOf', {
                count: item.count,
                total: summary.sampleCount
              }),
              number(item.min),
              number(item.max),
              number(item.mean),
              number(item.sd)
            ])}
          />
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t('studies')}</h2>
        {studies.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('noStudies')}</p>
        ) : (
          <ReportTable
            headers={[
              tColumns('study'),
              tColumns('samples'),
              tColumns('sampleCodes')
            ]}
            rows={studies.map(study => {
              const codes = samples
                .filter(sample => sample.studyIds.includes(study.id))
                .map(sample => sample.code);

              return [
                study.name,
                codes.length,
                <span key="codes" className="font-mono">
                  {codes.join(', ')}
                </span>
              ];
            })}
          />
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t('plots')}</h2>
        <SavedPlotsReport
          projectId={projectId}
          experimentId={experimentId}
          emptyText={t('noPlots')}
        />
      </div>
    </ReportShell>
  );
};
