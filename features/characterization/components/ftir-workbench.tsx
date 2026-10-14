'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { exportFtir } from '../export/export-ftir';
import type { FtirExportFormat } from '../export/export-ftir';
import { spotColor } from '../techniques/edx/colors';
import {
  detectPeaks,
  mergeSuggestions,
  unionOfPeaks
} from '../techniques/ftir/peaks';
import { processSpectrum } from '../techniques/ftir/process';
import { guessReading } from '../techniques/ftir/reading';
import type {
  FtirBond,
  FtirSettings,
  SpectrumPoint
} from '../techniques/ftir/types';
import { ftirSummary } from '../upload/summary-rows';
import { FtirChart } from './ftir-chart';
import { FtirControls } from './ftir-controls';
import { FtirExportMenu } from './ftir-export-menu';
import { FtirPeaksTable } from './ftir-peaks-table';

export type FtirSpectrumInput = {
  id: string;
  label: string;
  points: SpectrumPoint[];
};

type FtirWorkbenchProps = {
  spectra: FtirSpectrumInput[];
  settings: FtirSettings;
  onChange: (settings: FtirSettings) => void;
  /** Names exported files and titles the figure; a general name when left out. */
  title?: string;
  /** Buttons for the page that uses it (like Start over), shown beside Export. */
  actions?: ReactNode;
  /** The user's bond table, to suggest what each peak may be. */
  bonds?: FtirBond[];
};

/**
 * Everything to work on one or several spectra: the stacked chart, how they are
 * read and processed, the peaks (suggested, then curated by the user) and the
 * value read at each. Controlled, so a page, the upload workspace and the
 * experiment comparison all use it the same way.
 */
export const FtirWorkbench = ({
  spectra,
  settings,
  onChange,
  title,
  actions,
  bonds
}: FtirWorkbenchProps) => {
  const t = useTranslations('analysis.ftir');
  const tErrors = useTranslations('errors');
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, startExport] = useTransition();
  const [isReversed, setIsReversed] = useState(true);
  const processed = useMemo(
    () =>
      spectra.map(spectrum => ({
        ...spectrum,
        processed: processSpectrum(spectrum.points, settings)
      })),
    [spectra, settings]
  );
  const first = processed[0]?.processed;
  const guess = useMemo(
    () => guessReading(spectra[0]?.points ?? []),
    [spectra]
  );
  const dropped = processed.reduce(
    (sum, item) => sum + item.processed.dropped,
    0
  );

  const detect = () => {
    const lists = processed.map(item =>
      detectPeaks(item.processed.points, {
        orientation: item.processed.orientation,
        ...settings.detection
      })
    );
    onChange({
      ...settings,
      peaks: mergeSuggestions(
        settings.peaks,
        unionOfPeaks(lists, settings.detection.minSpacing),
        settings.detection.minSpacing,
        () => crypto.randomUUID()
      )
    });
  };

  const runExport = (format: FtirExportFormat) => {
    const chartElement = chartRef.current;
    if (!chartElement || !first) return;
    const lines = [
      settings.convertToAbsorbance && first.reading === 'absorbance'
        ? t('export.convertedLine')
        : t(`export.readingLine.${first.reading}`),
      first.isNormalised
        ? t('export.normalisedLine', {
            method: t(`controls.methods.${settings.normalisation.method}`)
          })
        : null,
      spectra.length > 1 ? t('export.stackedLine') : null
    ].filter((line): line is string => line !== null);

    startExport(async () => {
      try {
        await exportFtir(format, {
          chartElement,
          title: title ?? t('export.defaultTitle'),
          lines,
          legend:
            spectra.length > 1
              ? spectra.map((spectrum, index) => ({
                  label: spectrum.label,
                  color: spotColor(index)
                }))
              : [],
          table: ftirSummary(spectra, settings)
        });
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });
  };

  const yLabel = first?.isNormalised
    ? t('chart.yNormalised')
    : first?.reading === 'transmittance'
      ? t('chart.yTransmittance')
      : t('chart.yAbsorbance');

  return (
    <div className="grid min-w-0 gap-8">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
          <FtirExportMenu
            isBusy={isExporting}
            hasPeaks={settings.peaks.length > 0}
            onExport={runExport}
          />
        </div>
        <div ref={chartRef}>
          <FtirChart
            spectra={processed.map(({ id, label, processed: item }) => ({
              id,
              label,
              points: item.points
            }))}
            peaks={settings.peaks}
            offset={settings.offset}
            isReversed={isReversed}
            yLabel={yLabel}
            onAddPeak={position =>
              onChange({
                ...settings,
                peaks: [
                  ...settings.peaks,
                  { id: crypto.randomUUID(), position, label: '' }
                ]
              })
            }
          />
        </div>
      </div>
      {dropped > 0 && (
        <p className="text-muted-foreground text-sm">
          {t('dropped', { count: dropped })}
        </p>
      )}
      <FtirControls
        settings={settings}
        onChange={onChange}
        guess={guess}
        isStacked={spectra.length > 1}
        isReversed={isReversed}
        onReverseChange={setIsReversed}
        normaliseProblem={
          processed.find(item => item.processed.normaliseProblem)?.processed
            .normaliseProblem ?? null
        }
        onDetect={detect}
      />
      <FtirPeaksTable
        peaks={settings.peaks}
        spectra={processed}
        tolerance={settings.tolerance}
        bonds={bonds}
        onChange={peaks => onChange({ ...settings, peaks })}
      />
    </div>
  );
};
