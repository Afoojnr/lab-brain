'use client';

import { MessageSquareIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

import { CALENDAR_DATE_FORMAT, toCalendarDate } from '../parameters';
import type { Study, ParameterDefinition, Sample } from '../types';
import { AssignStudyBar } from './assign-study-bar';
import { formatParameterValue } from './format-parameter-value';
import { ParameterLabel } from './parameter-label';
import { RecordLink } from './record-link';

type SamplesTableProps = {
  projectId: string;
  experimentId: string;
  definitions: ParameterDefinition[];
  samples: Sample[];
  studies: Study[];
  /** True when a tag or search is hiding samples, so an empty table says so. */
  isFiltered: boolean;
};

/**
 * An experiment's samples like the rows of a spreadsheet: code, studies, date,
 * one column per parameter, then implementation and observation. An empty
 * cell means "not recorded", for example on samples made before a column was
 * added. Rows can be selected to tag them with a study in one step.
 */
export const SamplesTable = ({
  projectId,
  experimentId,
  definitions,
  samples,
  studies,
  isFiltered
}: SamplesTableProps) => {
  const t = useTranslations('samples.list');
  const tAssign = useTranslations('studies.assign');
  const format = useFormatter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (samples.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {isFiltered ? t('noMatch') : t('empty')}
      </p>
    );
  }

  const studyNames = new Map(studies.map(study => [study.id, study.name]));
  // A selection can outlive a filter change; only visible rows count.
  const visibleSelectedIds = samples
    .filter(sample => selectedIds.includes(sample.id))
    .map(sample => sample.id);
  const isAllSelected = visibleSelectedIds.length === samples.length;

  const toggleSample = (sampleId: string, isChecked: boolean) =>
    setSelectedIds(
      isChecked
        ? [...selectedIds, sampleId]
        : selectedIds.filter(id => id !== sampleId)
    );

  const notRecorded = (
    <>
      <span aria-hidden>-</span>
      <span className="sr-only">{t('notRecorded')}</span>
    </>
  );

  return (
    <>
      {visibleSelectedIds.length > 0 && (
        <AssignStudyBar
          projectId={projectId}
          experimentId={experimentId}
          studies={studies}
          selectedIds={visibleSelectedIds}
          onAssigned={() => setSelectedIds([])}
        />
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                aria-label={tAssign('selectAll')}
                checked={isAllSelected}
                indeterminate={visibleSelectedIds.length > 0 && !isAllSelected}
                onCheckedChange={isChecked =>
                  setSelectedIds(
                    isChecked ? samples.map(sample => sample.id) : []
                  )
                }
              />
            </TableHead>
            <TableHead>{t('columns.code')}</TableHead>
            <TableHead>{tAssign('tags')}</TableHead>
            <TableHead>{t('columns.date')}</TableHead>
            {definitions.map(definition => (
              <TableHead key={definition.id}>
                <ParameterLabel definition={definition} />
              </TableHead>
            ))}
            <TableHead>{t('columns.implementation')}</TableHead>
            <TableHead>{t('columns.observation')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {samples.map(sample => (
            <TableRow
              key={sample.id}
              className={sample.note ? 'bg-destructive/10' : undefined}
            >
              <TableCell>
                <Checkbox
                  aria-label={tAssign('selectRow', { code: sample.code })}
                  checked={visibleSelectedIds.includes(sample.id)}
                  onCheckedChange={isChecked =>
                    toggleSample(sample.id, isChecked)
                  }
                />
              </TableCell>
              <TableCell>
                <RecordLink
                  href={`/projects/${projectId}/experiments/${experimentId}/samples/${sample.id}`}
                >
                  {sample.code}
                </RecordLink>
                {sample.note && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span
                          tabIndex={0}
                          className="ml-1.5 inline-flex cursor-help align-middle"
                        />
                      }
                    >
                      <MessageSquareIcon className="size-3.5" aria-hidden />
                      <span className="sr-only">
                        {t('noteLabel')}: {sample.note}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{sample.note}</TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell>
                {sample.studyIds.length === 0 ? (
                  notRecorded
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {sample.studyIds.map(id => (
                      <Badge key={id} variant="secondary">
                        {studyNames.get(id)}
                      </Badge>
                    ))}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {sample.performedOn
                  ? format.dateTime(
                      toCalendarDate(sample.performedOn),
                      CALENDAR_DATE_FORMAT
                    )
                  : notRecorded}
              </TableCell>
              {definitions.map(definition => {
                const value = sample.values[definition.id];
                return (
                  <TableCell key={definition.id}>
                    {value === undefined
                      ? notRecorded
                      : formatParameterValue(format, value)}
                  </TableCell>
                );
              })}
              {[sample.implementation, sample.observation].map(
                (text, index) => (
                  <TableCell
                    key={index}
                    className="text-muted-foreground max-w-56"
                  >
                    <span className="block truncate" title={text ?? undefined}>
                      {text ?? notRecorded}
                    </span>
                  </TableCell>
                )
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};
