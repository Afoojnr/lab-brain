import { Fragment } from 'react';
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
import type { Characterization, Dataset } from '../types';
import { AttachFilesDialog } from './attach-files-dialog';
import { DatasetList } from './dataset-list';
import { CharacterizationDialog } from './characterization-dialog';
import { DeleteCharacterizationDialog } from './delete-characterization-dialog';

type CharacterizationsTableProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterizations: Characterization[];
  /** The files of all the sample's characterizations. */
  datasets: Dataset[];
  knownTechniques: string[];
};

/** A sample's characterizations with edit and delete per row, or a hint to add the first one. */
export const CharacterizationsTable = async ({
  projectId,
  experimentId,
  sampleId,
  characterizations,
  datasets,
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
          <TableHead className="w-28">
            <span className="sr-only">{t('columns.actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {characterizations.map(item => {
          const files = datasets.filter(
            dataset => dataset.characterizationId === item.id
          );

          return (
            <Fragment key={item.id}>
              <TableRow>
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
                <TableCell className="text-muted-foreground">
                  {item.note}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <AttachFilesDialog
                      projectId={projectId}
                      experimentId={experimentId}
                      sampleId={sampleId}
                      characterization={item}
                    />
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
              {files.length > 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="whitespace-normal">
                    <DatasetList
                      projectId={projectId}
                      experimentId={experimentId}
                      sampleId={sampleId}
                      characterizationId={item.id}
                      datasets={files}
                    />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};
