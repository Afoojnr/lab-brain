'use client';

import { useTranslations } from 'next-intl';

import { formatValue } from '../analysis/results';
import { nearestPoint } from '../techniques/ftir/display';
import type { SpectrumPoint } from '../techniques/ftir/types';

type FtirTooltipProps = {
  isActive: boolean;
  /** The wavenumber under the pointer. */
  wavenumber: number;
  spectra: {
    id: string;
    label: string;
    color: string;
    points: SpectrumPoint[];
  }[];
};

/**
 * What hovering the chart says: the wavenumber first, then each spectrum's own
 * value nearest to it (not the shifted line that is drawn). If a spectrum has no
 * point at that wavenumber, the one it has nearest is shown with where it is.
 */
export const FtirTooltip = ({
  isActive,
  wavenumber,
  spectra
}: FtirTooltipProps) => {
  const t = useTranslations('analysis.ftir.chart');
  if (!isActive || !Number.isFinite(wavenumber)) return null;

  return (
    <div className="bg-background rounded-md border px-3 py-2 text-sm shadow-md">
      <p className="font-medium tabular-nums">
        {t('tooltipWavenumber', { position: formatValue(wavenumber) })}
      </p>
      <ul className="mt-1 grid gap-0.5">
        {spectra.map(spectrum => {
          const point = nearestPoint(spectrum.points, wavenumber);

          return (
            <li key={spectrum.id} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: spectrum.color }}
              />
              <span className="text-muted-foreground">{spectrum.label}</span>
              {point ? (
                <span className="tabular-nums">
                  {formatValue(point.y)}
                  {Math.abs(point.x - wavenumber) > 1 && (
                    <span className="text-muted-foreground text-xs">
                      {' '}
                      {t('tooltipAt', { position: formatValue(point.x) })}
                    </span>
                  )}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
