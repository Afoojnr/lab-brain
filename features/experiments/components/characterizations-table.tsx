import { getFormatter, getTranslations } from 'next-intl/server';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { CALENDAR_DATE_FORMAT, toCalendarDate } from '../parameters';
import type { Characterization } from '../types';
import { CharacterizationDialog } from './characterization-dialog';
import { DeleteCharacterizationDialog } from './delete-characterization-dialog';

type CharacterizationsTableProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterizations: Characterization[];
  knownTechniques: string[];
};

/** A sample's characterizations with edit and delete per row, or a hint to add the first one. */
export const CharacterizationsTable = async ({
  projectId,
  experimentId,
  sampleId,
  characterizations,
  knownTechniques
}: CharacterizationsTableProps) => {
  const [t, format] = await Promise.all([
    getTranslations('characterizations.panel'),
    getFormatter()
  ]);

  if (characterizations.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('empty')}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('columns.technique')}</TableHead>
          <TableHead>{t('columns.date')}</TableHead>
          <TableHead>{t('columns.note')}</TableHead>
          <TableHead className="w-20">
            <span className="sr-only">{t('columns.actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {characterizations.map(item => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.technique}</TableCell>
            <TableCell>
              {item.measuredOn ? (
                format.dateTime(
                  toCalendarDate(item.measuredOn),
                  CALENDAR_DATE_FORMAT
                )
              ) : (
                <span className="text-muted-foreground">{t('noDate')}</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{item.note}</TableCell>
            <TableCell>
              <div className="flex justify-end gap-1">
                <CharacterizationDialog
                  projectId={projectId}
                  experimentId={experimentId}
                  sampleId={sampleId}
                  knownTechniques={knownTechniques}
                  characterization={item}
                />
                <DeleteCharacterizationDialog
                  projectId={projectId}
                  experimentId={experimentId}
                  sampleId={sampleId}
                  characterization={item}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
