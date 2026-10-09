import { getTranslations } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { displayFormula } from '../formula';
import type { DerivedColumn, ParameterDefinition, Sample } from '../types';
import { DeleteDerivedColumnDialog } from './delete-derived-column-dialog';
import { DerivedColumnDialog } from './derived-column-dialog';

type DerivedColumnsTableProps = {
  projectId: string;
  experimentId: string;
  columns: ParameterDefinition[];
  derivedColumns: DerivedColumn[];
  previewSamples: Pick<Sample, 'id' | 'code' | 'values'>[];
};

/** An experiment's calculated columns with their formulas, edit and delete per row, or a hint to add the first one. */
export const DerivedColumnsTable = async ({
  projectId,
  experimentId,
  columns,
  derivedColumns,
  previewSamples
}: DerivedColumnsTableProps) => {
  const t = await getTranslations('derived');

  if (derivedColumns.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('panel.empty')}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('panel.columns.name')}</TableHead>
          <TableHead>{t('panel.columns.unit')}</TableHead>
          <TableHead>{t('panel.columns.formula')}</TableHead>
          <TableHead className="w-20">
            <span className="sr-only">{t('panel.columns.actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {derivedColumns.map(derived => (
          <TableRow key={derived.id}>
            <TableCell className="font-medium">{derived.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {derived.unit ?? t('panel.noUnit')}
            </TableCell>
            <TableCell className="font-mono text-xs whitespace-normal">
              {displayFormula(derived.formula, columns)}
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <DerivedColumnDialog
                  projectId={projectId}
                  experimentId={experimentId}
                  columns={columns}
                  otherNames={[
                    ...columns.map(column => column.name),
                    ...derivedColumns
                      .filter(other => other.id !== derived.id)
                      .map(other => other.name)
                  ]}
                  previewSamples={previewSamples}
                  derived={{
                    id: derived.id,
                    name: derived.name,
                    unit: derived.unit,
                    formulaText: displayFormula(derived.formula, columns)
                  }}
                />
                <DeleteDerivedColumnDialog
                  projectId={projectId}
                  experimentId={experimentId}
                  derived={derived}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
