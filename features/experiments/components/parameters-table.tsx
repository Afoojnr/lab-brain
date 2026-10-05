import { getFormatter, getTranslations } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import type { ParameterDefinition } from '../types';
import { DeleteParameterButton } from './delete-parameter-button';
import { formatParameterValue } from './format-parameter-value';
import { ParameterDialog } from './parameter-dialog';

type ParametersTableProps = {
  projectId: string;
  experimentId: string;
  definitions: ParameterDefinition[];
  /** Ids of parameters that samples hold values for. */
  usedIds: string[];
};

/** An experiment's parameters with edit and delete per row, or a hint to add the first one. */
export const ParametersTable = async ({
  projectId,
  experimentId,
  definitions,
  usedIds
}: ParametersTableProps) => {
  const [t, format] = await Promise.all([
    getTranslations('parameters'),
    getFormatter()
  ]);

  if (definitions.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('panel.empty')}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('panel.columns.name')}</TableHead>
          <TableHead>{t('panel.columns.unit')}</TableHead>
          <TableHead className="hidden sm:table-cell">
            {t('panel.columns.kind')}
          </TableHead>
          <TableHead>{t('panel.columns.default')}</TableHead>
          <TableHead className="w-20">
            <span className="sr-only">{t('panel.columns.actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {definitions.map(definition => {
          const isInUse = usedIds.includes(definition.id);

          return (
            <TableRow key={definition.id}>
              <TableCell className="font-medium">{definition.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {definition.unit ?? t('panel.noUnit')}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {t(`kinds.${definition.kind}`)}
              </TableCell>
              <TableCell>
                {definition.defaultValue === null ? (
                  <span className="text-muted-foreground">
                    {t('panel.noDefault')}
                  </span>
                ) : (
                  formatParameterValue(format, definition.defaultValue)
                )}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <ParameterDialog
                    projectId={projectId}
                    experimentId={experimentId}
                    parameter={definition}
                    isKindLocked={isInUse}
                    otherNames={definitions
                      .filter(other => other.id !== definition.id)
                      .map(other => other.name)}
                  />
                  <DeleteParameterButton
                    projectId={projectId}
                    experimentId={experimentId}
                    parameter={definition}
                    isInUse={isInUse}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
