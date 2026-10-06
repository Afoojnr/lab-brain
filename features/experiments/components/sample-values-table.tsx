import { getFormatter, getTranslations } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import type { ParameterDefinition, Sample } from '../types';
import { formatParameterValue } from './format-parameter-value';

/** One group of a sample's columns (its parameters or its results) with each recorded value and unit. */
export const SampleValuesTable = async ({
  definitions,
  sample
}: {
  definitions: ParameterDefinition[];
  sample: Pick<Sample, 'values'>;
}) => {
  const [t, format] = await Promise.all([
    getTranslations('samples.detail.parameters'),
    getFormatter()
  ]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('name')}</TableHead>
          <TableHead>{t('value')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {definitions.map(definition => {
          const value = sample.values[definition.id];

          return (
            <TableRow key={definition.id}>
              <TableCell className="font-medium">{definition.name}</TableCell>
              <TableCell>
                {value === undefined ? (
                  <span className="text-muted-foreground">
                    {t('notRecorded')}
                  </span>
                ) : (
                  `${formatParameterValue(format, value)}${definition.unit ? ` ${definition.unit}` : ''}`
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
