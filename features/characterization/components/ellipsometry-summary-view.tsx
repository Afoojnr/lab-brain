'use client';

import { useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { formatValue } from '../results';
import type { SeqfitSummary } from '../techniques/ellipsometry/parse';

/**
 * What an ellipsometry fit export says: the thickness and n, each with its
 * standard deviation, as the file's summary rows give them, and the thickness
 * at each fitted point.
 */
export const EllipsometrySummaryView = ({
  summary
}: {
  summary: SeqfitSummary;
}) => {
  const t = useTranslations('analysis.ellipsometry');

  return (
    <div className="grid min-w-0 gap-8">
      <section className="grid gap-2">
        <h3 className="font-medium">{t('summaryTitle')}</h3>
        <dl className="grid max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{t('thickness')}</dt>
          <dd className="tabular-nums">
            {formatValue(summary.thickness.mean)} ±{' '}
            {formatValue(summary.thickness.std)} nm
          </dd>
          <dt className="text-muted-foreground">{t('n')}</dt>
          <dd className="tabular-nums">
            {formatValue(summary.n.mean)} ± {formatValue(summary.n.std)}
          </dd>
        </dl>
        <p className="text-muted-foreground text-xs">{t('notice')}</p>
      </section>
      {summary.points.length > 0 && (
        <section className="grid gap-3">
          <h3 className="font-medium">{t('pointsTitle')}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.points}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip
                  formatter={value =>
                    typeof value === 'number'
                      ? formatValue(value)
                      : String(value ?? '')
                  }
                />
                <Bar
                  dataKey="thickness"
                  name={t('thickness')}
                  fill="#2563eb"
                  fillOpacity={0.7}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
};
