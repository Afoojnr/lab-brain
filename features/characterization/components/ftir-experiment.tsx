import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { listParameterDefinitions } from '@/features/experiments/server';

import { getAnalysis, latestTargets } from '../data/analyses';
import { listBonds } from '../data/ftir-bonds';
import { loadFtirBatchRows } from '../batch/load-ftir-batch';
import { defaultFtirSettings } from '../techniques/ftir/defaults';
import { FtirBatch } from './ftir-batch';

/**
 * The FTIR comparison of one experiment: its measurements, the result columns,
 * and what was chosen last time (the peaks, where each value goes), so the work
 * is there when you come back.
 */
export const FtirExperiment = async ({
  projectId,
  experimentId,
  experimentName
}: {
  projectId: string;
  experimentId: string;
  experimentName: string;
}) => {
  const [t, tNavigation, rows, definitions] = await Promise.all([
    getTranslations('analysis.workspace.experiment'),
    getTranslations('navigation'),
    loadFtirBatchRows(experimentId),
    listParameterDefinitions(experimentId)
  ]);

  if (rows.length === 0) {
    return (
      <div className="grid gap-2">
        <p className="text-muted-foreground text-sm">
          {t('noRows', { technique: tNavigation('ftir') })}
        </p>
        <Link
          href="/characterization/ftir?source=upload"
          className="text-sm underline underline-offset-4"
        >
          {t('orUpload')}
        </Link>
      </div>
    );
  }

  const ids = rows.map(row => row.characterizationId);
  const saved = (
    await Promise.all(ids.map(id => getAnalysis(id, 'ftir')))
  ).find(analysis => analysis?.settings.ftir);
  const columns = definitions
    .filter(column => column.role === 'result' && column.kind === 'number')
    .map(column => ({ id: column.id, name: column.name, unit: column.unit }));

  return (
    <FtirBatch
      // A new experiment starts fresh; a different one never inherits ticks.
      key={experimentId}
      projectId={projectId}
      experimentId={experimentId}
      exportTitle={`${experimentName} · FTIR`}
      bonds={await listBonds()}
      rows={rows}
      columns={columns}
      initialSettings={saved?.settings.ftir ?? defaultFtirSettings()}
      initialSelectedIds={saved?.settings.selectedValueIds ?? []}
      initialTargets={await latestTargets(ids, 'ftir')}
    />
  );
};
