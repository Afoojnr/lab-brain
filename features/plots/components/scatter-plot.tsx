'use client';

import { useRouter } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import {
  CartesianGrid,
  ErrorBar,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from 'recharts';

import { useIsMobile } from '@/hooks/use-mobile';

import { columnLabel } from '../column-label';
import { seriesLabel, seriesStyle } from '../series-style';
import { axisDomain, MARKER_AREAS, TEXT_SIZES } from '../style';
import type { PlotStyle } from '../style';
import type { PlotColumn, PlotPoint, PlotSeries } from '../types';

const MUTED = 'var(--muted-foreground)';

type ScatterPlotProps = {
  series: PlotSeries[];
  /** Group keys of the whole table, so a group keeps its colour while others are filtered out. */
  colorOrder: string[];
  xColumn: PlotColumn;
  yColumn: PlotColumn;
  errorColumn: PlotColumn | null;
  logX: boolean;
  logY: boolean;
  plotStyle: PlotStyle;
};

type Datum = PlotPoint & {
  /** The same for every point; a Z axis needs a value to size the markers by. */
  size: 1;
  /** Below and above the point, as Recharts wants an asymmetric bar. */
  errorRange?: [number, number];
};

const useSeriesName = () => {
  const t = useTranslations('plots.chart');

  return (series: PlotSeries) =>
    seriesLabel(series, {
      noStudy: t('noStudy'),
      noValue: t('noValue'),
      other: t('other')
    });
};

/**
 * A scatter plot with one colour and marker shape per group (the shape keeps
 * groups apart without colour), optional error bars, and a legend whenever there
 * are two or more groups. Clicking a point opens its sample.
 */
export const ScatterPlot = ({
  series,
  colorOrder,
  xColumn,
  yColumn,
  errorColumn,
  logX,
  logY,
  plotStyle
}: ScatterPlotProps) => {
  const t = useTranslations('plots.chart');
  const router = useRouter();
  const format = useFormatter();
  const nameOf = useSeriesName();
  const isMobile = useIsMobile();
  const sizes = TEXT_SIZES[plotStyle.textSize];
  const markerArea = MARKER_AREAS[plotStyle.markerSize];
  const xTitle = plotStyle.xTitle.trim() || columnLabel(xColumn);
  const yTitle = plotStyle.yTitle.trim() || columnLabel(yColumn);
  const title = plotStyle.title.trim();
  const formatNumber = (value: number) =>
    format.number(value, { maximumSignificantDigits: 6 });

  // On a log axis a bar longer than the value would reach 0 or below, which
  // has no place on the axis, so its lower end stops just above 0. The
  // tooltip always gives the real error value.
  const toDatum = (point: PlotPoint): Datum => ({
    ...point,
    size: 1,
    ...(point.error === undefined
      ? {}
      : {
          errorRange: [
            logY ? Math.min(point.error, point.y * 0.999) : point.error,
            point.error
          ] as [number, number]
        })
  });

  return (
    <div className="grid gap-3">
      {title && (
        <h3 className="font-medium" style={{ fontSize: sizes.label * 1.25 }}>
          {title}
        </h3>
      )}
      {series.length > 1 && (
        <ul
          aria-label={t('legend')}
          className="flex flex-wrap gap-x-4 gap-y-1"
          style={{ fontSize: sizes.legend }}
        >
          {series.map((item, index) => (
            <li key={item.key} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{
                  backgroundColor: seriesStyle(item, index, colorOrder).color
                }}
              />
              {nameOf(item)}
            </li>
          ))}
        </ul>
      )}
      <div
        role="img"
        aria-label={t('label', {
          x: columnLabel(xColumn),
          y: columnLabel(yColumn)
        })}
        className="h-72 w-full sm:h-96"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: 8,
              right: isMobile ? 8 : 16,
              bottom: 24 + (plotStyle.textSize === 'large' ? 8 : 0),
              left: isMobile ? 0 : 8
            }}
          >
            {plotStyle.showGrid && (
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            )}
            <ZAxis
              type="number"
              dataKey="size"
              range={[markerArea, markerArea]}
            />
            <XAxis
              type="number"
              dataKey="x"
              scale={logX ? 'log' : 'auto'}
              domain={axisDomain(plotStyle.xMin, plotStyle.xMax, logX)}
              allowDataOverflow
              tickLine={false}
              stroke={MUTED}
              tickFormatter={formatNumber}
              tick={{ fontSize: sizes.tick, fill: MUTED }}
              label={{
                value: xTitle,
                position: 'insideBottom',
                offset: -12,
                fill: MUTED,
                style: { fontSize: sizes.label }
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              scale={logY ? 'log' : 'auto'}
              domain={axisDomain(plotStyle.yMin, plotStyle.yMax, logY)}
              allowDataOverflow
              tickLine={false}
              stroke={MUTED}
              tickFormatter={formatNumber}
              tick={{ fontSize: sizes.tick, fill: MUTED }}
              width={
                (isMobile ? 48 : 64) + (plotStyle.textSize === 'large' ? 10 : 0)
              }
              label={{
                value: yTitle,
                angle: -90,
                position: 'insideLeft',
                fill: MUTED,
                style: { fontSize: sizes.label, textAnchor: 'middle' }
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as Datum | undefined;
                if (!active || !point) return null;

                return (
                  <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-md">
                    <p className="font-mono font-medium">{point.label}</p>
                    <p>
                      {columnLabel(xColumn)}: {formatNumber(point.x)}
                    </p>
                    <p>
                      {columnLabel(yColumn)}: {formatNumber(point.y)}
                    </p>
                    {errorColumn && point.error !== undefined && (
                      <p>
                        {columnLabel(errorColumn)}: {formatNumber(point.error)}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            {series.map((item, index) => {
              const style = seriesStyle(item, index, colorOrder);

              return (
                <Scatter
                  key={item.key}
                  name={nameOf(item)}
                  data={item.points.map(toDatum)}
                  fill={style.color}
                  stroke="var(--background)"
                  strokeWidth={2}
                  shape={style.shape}
                  isAnimationActive={false}
                  cursor="pointer"
                  onClick={(datum: unknown) => {
                    const href = (datum as Datum).href;
                    if (href) router.push(href);
                  }}
                >
                  {errorColumn && (
                    <ErrorBar
                      dataKey="errorRange"
                      direction="y"
                      stroke={style.color}
                      strokeWidth={2}
                      width={6}
                    />
                  )}
                </Scatter>
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
