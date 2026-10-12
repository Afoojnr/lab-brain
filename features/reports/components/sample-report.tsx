import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  getExperimentInProject,
  getProjectById,
  getSampleById,
  listCharacterizationsByExperiment,
  listDatasetsBySample,
  listDerivedColumns,
  listParameterDefinitions,
  listStudiesByExperiment
} from '@/features/experiments/server';
import {
  CALENDAR_DATE_FORMAT,
  evaluateFormula,
  parseFormula,
  toCalendarDate
} from '@/features/experiments/shared';

import { calculatedText, valueText } from '../format';
import { ReportShell } from './report-shell';
import { ReportTable } from './report-table';

/** At most this many file names are written for one measurement; the rest are counted. */
const MAX_FILE_NAMES = 4;

type SampleReportProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
};

/**
 * One sample as a printable report: what it is, its settings and results,
 * calculated values, notes, and the measurements done on it with their files.
 * A value that was not recorded is written as "Not recorded", never as 0.
 */
export const SampleReport = async ({
  projectId,
  experimentId,
  sampleId
}: SampleReportProps) => {
  const [project, experiment, sample] = await Promise.all([
    getProjectById(projectId),
    getExperimentInProject(projectId, experimentId),
    getSampleById(sampleId)
  ]);
  if (
    !project ||
    !experiment ||
    !sample ||
    sample.experimentId !== experiment.id
  ) {
    notFound();
  }

  const [
    t,
    tColumns,
    tReports,
    format,
    definitions,
    derived,
    studies,
    allCharacterizations,
    datasets
  ] = await Promise.all([
    getTranslations('reports.samples'),
    getTranslations('reports.columns'),
    getTranslations('reports'),
    getFormatter(),
    listParameterDefinitions(experiment.id),
    listDerivedColumns(experiment.id),
    listStudiesByExperiment(experiment.id),
    listCharacterizationsByExperiment(experiment.id),
    listDatasetsBySample(sample.id)
  ]);
  const notRecorded = tReports('notRecorded');
  const parameters = definitions.filter(item => item.role === 'parameter');
  const results = definitions.filter(item => item.role === 'result');
  const sampleStudies = studies.filter(study =>
    sample.studyIds.includes(study.id)
  );
  const characterizations = allCharacterizations.filter(
    item => item.sampleId === sample.id
  );
  const valuesTable = (columns: typeof definitions) => (
    <ReportTable
      headers={[tColumns('name'), tColumns('unit'), t('value')]}
      rows={columns.map(column => [
        column.name,
        column.unit ?? '',
        valueText(format, sample.values[column.id], notRecorded)
      ])}
    />
  );
  const formulas = derived.map(item => ({
    item,
    parsed: parseFormula(item.formula, definitions)
  }));

  return (
    <ReportShell
      kind="sample"
      title={sample.code}
      subtitle={`${project.name} · ${experiment.name}`}
      backHref={`/projects/${project.id}/experiments/${experiment.id}/samples/${sample.id}`}
      orientation="portrait"
    >
      <dl className="report-block grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t('date')}</dt>
        <dd>
          {sample.performedOn
            ? format.dateTime(
                toCalendarDate(sample.performedOn),
                CALENDAR_DATE_FORMAT
              )
            : notRecorded}
        </dd>
        <dt className="text-muted-foreground">{t('studies')}</dt>
        <dd>{sampleStudies.map(study => study.name).join(', ') || '-'}</dd>
      </dl>

      {sample.implementation && (
        <div className="report-block">
          <h2 className="mb-2 text-lg font-semibold">{t('implementation')}</h2>
          <p className="text-sm whitespace-pre-wrap">{sample.implementation}</p>
        </div>
      )}

      {parameters.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">{t('parameters')}</h2>
          {valuesTable(parameters)}
        </div>
      )}
      {results.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">{t('results')}</h2>
          {valuesTable(results)}
        </div>
      )}
      {formulas.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">{t('calculated')}</h2>
          <ReportTable
            headers={[tColumns('name'), tColumns('unit'), t('value')]}
            rows={formulas.map(({ item, parsed }) => [
              item.name,
              item.unit ?? '',
              calculatedText(
                format,
                parsed.isOk ? evaluateFormula(parsed.ast, sample.values) : null,
                notRecorded
              )
            ])}
          />
        </div>
      )}

      {sample.observation && (
        <div className="report-block">
          <h2 className="mb-2 text-lg font-semibold">{t('observation')}</h2>
          <p className="text-sm whitespace-pre-wrap">{sample.observation}</p>
        </div>
      )}
      {sample.note && (
        <div className="report-block">
          <h2 className="mb-2 text-lg font-semibold">{t('note')}</h2>
          <p className="text-sm whitespace-pre-wrap">{sample.note}</p>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">{t('characterizations')}</h2>
        {characterizations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('noCharacterizations')}
          </p>
        ) : (
          <ReportTable
            headers={[t('technique'), t('measured'), t('note'), t('files')]}
            rows={characterizations.map(item => {
              const names = datasets
                .filter(dataset => dataset.characterizationId === item.id)
                .map(dataset => dataset.fileName);
              const shown = names.slice(0, MAX_FILE_NAMES);
              const more = names.length - shown.length;

              return [
                item.technique,
                item.measuredOn
                  ? format.dateTime(
                      toCalendarDate(item.measuredOn),
                      CALENDAR_DATE_FORMAT
                    )
                  : notRecorded,
                item.note ?? '',
                names.length === 0
                  ? t('noFiles')
                  : `${shown.join(', ')}${more > 0 ? ` ${t('moreFiles', { count: more })}` : ''}`
              ];
            })}
          />
        )}
      </div>
    </ReportShell>
  );
};
