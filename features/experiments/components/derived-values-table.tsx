import { getFormatter, getTranslations } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { calculateForSamples } from '../derived-values';
import type { DerivedColumn, ParameterDefinition, Sample } from '../types';
import { formatDerivedValue } from './format-parameter-value';

/** A sample's calculated values, worked out now from its other columns; empty ones say "not recorded". */
export const DerivedValuesTable = async ({
  derivedColumns,
  columns,
  sample
}: {
  derivedColumns: DerivedColumn[];
  columns: ParameterDefinition[];
  sample: Pick<Sample, 'id' | 'values'>;
}) => {
  const [t, format] = await Promise.all([
    getTranslations('derived.sample'),
    getFormatter()
  ]);

  const calculated = calculateForSamples(columns, derivedColumns, [sample])[
    sample.id
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('title')}</TableHead>
          <TableHead>{t('value')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {derivedColumns.map(derived => {
          const value = calculated?.[derived.id] ?? null;

          return (
            <TableRow key={derived.id}>
              <TableCell className="font-medium">{derived.name}</TableCell>
              <TableCell>
                {value === null ? (
                  <span className="text-muted-foreground">
                    {t('notRecorded')}
                  </span>
                ) : (
                  `${formatDerivedValue(format, value)}${derived.unit ? ` ${derived.unit}` : ''}`
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
