'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { spotColor } from '../techniques/edx/colors';
import { forChart } from '../techniques/ftir/display';
import type { FtirPeak, SpectrumPoint } from '../techniques/ftir/types';
import { FtirTooltip } from './ftir-tooltip';

const MAX_POINTS = 1600;

export type ChartSpectrum = {
  id: string;
  label: string;
  points: SpectrumPoint[];
};

type FtirChartProps = {
  spectra: ChartSpectrum[];
  peaks: FtirPeak[];
  /** Gap between stacked spectra, as a fraction of the tallest spectrum's span. */
  offset: number;
  /** High wavenumbers on the left, the usual way to show an infrared spectrum. */
  isReversed: boolean;
  yLabel: string;
  /** Called with the wavenumber of a click on the chart. */
  onAddPeak: (position: number) => void;
};

/** A peak's text above the plot, on one of three rows so close peaks do not overwrite each other. */
const PeakLabel = ({
  x,
  y,
  row,
  text
}: {
  x: number;
  y: number;
  row: number;
  text: string;
}) => (
  <text
    x={x}
    y={y - 6 - (row % 3) * 13}
    textAnchor="middle"
    fontSize={11}
    fill="currentColor"
    fillOpacity={0.8}
  >
    {text}
  </text>
);

const spanOf = (points: SpectrumPoint[]): number => {
  const values = points.map(point => point.y);

  return Math.max(...values) - Math.min(...values);
};

/**
 * The spectra drawn one above another (shifted by the offset so they can be
 * compared), with a dashed line and label at every peak.
 */
export const FtirChart = ({
  spectra,
  peaks,
  offset,
  isReversed,
  yLabel,
  onAddPeak
}: FtirChartProps) => {
  const t = useTranslations('analysis.ftir.chart');
  const lines = useMemo(() => {
    const step = offset * Math.max(...spectra.map(item => spanOf(item.points)));

    return spectra.map((spectrum, index) => ({
      ...spectrum,
      color: spotColor(index),
      data: forChart(spectrum.points, MAX_POINTS).map(point => ({
        x: point.x,
        shown: point.y + index * step,
        raw: point.y
      }))
    }));
  }, [spectra, offset]);
  const isStacked = lines.length > 1;
  // Whole hundreds at both ends, so the axis reads 600, 1000, … not 525.0337.
  const wavenumbers = spectra.flatMap(item =>
    item.points.map(point => point.x)
  );
  const domain: [number, number] = [
    Math.floor(Math.min(...wavenumbers) / 100) * 100,
    Math.ceil(Math.max(...wavenumbers) / 100) * 100
  ];

  return (
    <div className="grid gap-2">
      <div className="h-96 w-full" data-testid="ftir-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={lines[0]?.data}
            margin={{ top: 48, right: 16, bottom: 8, left: 16 }}
            onClick={state => {
              const position = Number(state?.activeLabel);
              if (Number.isFinite(position))
                onAddPeak(Math.round(position * 10) / 10);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={domain}
              tickCount={9}
              tickFormatter={value => String(Math.round(Number(value)))}
              reversed={isReversed}
              allowDataOverflow
              label={{
                value: t('axisX'),
                position: 'insideBottom',
                offset: -4
              }}
            />
            <YAxis
              hide={isStacked}
              width={64}
              label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              content={({ active, label }) => (
                <FtirTooltip
                  isActive={Boolean(active)}
                  wavenumber={Number(label)}
                  spectra={lines}
                />
              )}
            />
            {isStacked && <Legend />}
            {lines.map(line => (
              <Line
                key={line.id}
                name={line.label}
                data={line.data}
                dataKey="shown"
                dot={false}
                // Spectra can have different points; the cursor line and the tooltip say where, a dot could sit elsewhere.
                activeDot={false}
                stroke={line.color}
                strokeWidth={1.25}
                isAnimationActive={false}
              />
            ))}
            {peaks
              .filter(
                peak => peak.position >= domain[0] && peak.position <= domain[1]
              )
              .map((peak, row) => (
                <ReferenceLine
                  key={peak.id}
                  x={peak.position}
                  stroke="currentColor"
                  strokeDasharray="4 3"
                  strokeOpacity={0.6}
                  // Hidden would also clip the label above the plot; peaks outside the axis are left out above.
                  ifOverflow="visible"
                  label={({
                    viewBox
                  }: {
                    viewBox?: { x?: number; y?: number };
                  }) => (
                    <PeakLabel
                      x={viewBox?.x ?? 0}
                      y={viewBox?.y ?? 0}
                      row={row}
                      text={
                        peak.label.trim() === ''
                          ? String(Math.round(peak.position))
                          : `${Math.round(peak.position)} ${peak.label.trim()}`
                      }
                    />
                  )}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-muted-foreground text-xs">{t('clickHint')}</p>
    </div>
  );
};
