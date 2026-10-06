'use client';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import type { ConflictChoice } from '../../types';
import type { ImportReport, RowReport } from '../../validation-types';
import { issueKey } from './issue-text';

type PreviewStepProps = {
  report: ImportReport;
  headers: string[];
  choices: Record<string, ConflictChoice>;
  shouldSkipErrorRows: boolean;
  isImporting: boolean;
  onChoicesChange: (choices: Record<string, ConflictChoice>) => void;
  onSkipErrorRowsChange: (shouldSkip: boolean) => void;
  onImport: () => void;
};

type ChoiceAction = ConflictChoice['action'];

/** Step 5: what will happen to every row, before anything is saved. */
export const PreviewStep = ({
  report,
  headers,
  choices,
  shouldSkipErrorRows,
  isImporting,
  onChoicesChange,
  onSkipErrorRowsChange,
  onImport
}: PreviewStepProps) => {
  const t = useTranslations('import.preview');
  const tIssues = useTranslations('import.issues');
  const attention = report.rows.filter(
    row => row.status === 'conflict' || row.status === 'error'
  );
  const conflicts = report.rows.filter(row => row.status === 'conflict');
  const setupMessages = [
    ...report.setupIssues,
    ...report.targetIssues,
    ...report.columnIssues.map(issue => issue.message)
  ];

  const choose = (row: RowReport, action: ChoiceAction) =>
    onChoicesChange({
      ...choices,
      [row.sheetRow]:
        action === 'addAsNew' ? { action, code: row.code } : { action }
    });
  const applyToAll = (action: 'skip' | 'update') =>
    onChoicesChange({
      ...choices,
      ...Object.fromEntries(
        conflicts
          .filter(row => action === 'skip' || row.canUpdate)
          .map(row => [row.sheetRow, { action }])
      )
    });

  const choiceItems = (row: RowReport) => [
    { value: 'skip', label: t('choice.skip') },
    ...(row.canUpdate ? [{ value: 'update', label: t('choice.update') }] : []),
    { value: 'addAsNew', label: t('choice.addAsNew') }
  ];
  const applyItems = [
    { value: 'skip', label: t('choice.skip') },
    { value: 'update', label: t('choice.update') }
  ];

  return (
    <div className="grid gap-6">
      <p className="text-muted-foreground text-sm">{t('description')}</p>
      <ul className="flex flex-wrap gap-2" aria-label={t('title')}>
        {(['new', 'conflict', 'error', 'empty'] as const).map(status => (
          <li key={status}>
            <Badge variant={status === 'error' ? 'destructive' : 'secondary'}>
              {t(`counts.${status}`, { count: report.counts[status] })}
            </Badge>
          </li>
        ))}
      </ul>
      {setupMessages.length > 0 && (
        <ul className="text-destructive grid gap-1 text-sm" role="alert">
          {setupMessages.map((message, index) => (
            <li key={index}>{tIssues(issueKey(message))}</li>
          ))}
        </ul>
      )}
      {report.counts.error > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="import-skip-errors"
            checked={shouldSkipErrorRows}
            onCheckedChange={isChecked => onSkipErrorRowsChange(isChecked)}
          />
          <Label htmlFor="import-skip-errors">{t('skipErrors')}</Label>
        </div>
      )}
      {conflicts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="import-apply-all">{t('applyAll')}</Label>
          <Select
            items={applyItems}
            value={null}
            onValueChange={value => {
              if (value === 'skip' || value === 'update') applyToAll(value);
            }}
          >
            <SelectTrigger id="import-apply-all" className="w-64">
              <SelectValue placeholder={t('applyAllPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {applyItems.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-2">
        <h3 className="text-sm font-medium">{t('attention')}</h3>
        {attention.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('nothingToReview')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t('table.row')}</TableHead>
                <TableHead>{t('table.code')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.details')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attention.map(row => {
                const choice = choices[row.sheetRow];

                return (
                  <TableRow key={row.sheetRow}>
                    <TableCell>{row.sheetRow}</TableCell>
                    <TableCell className="font-mono">{row.code}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === 'error' ? 'destructive' : 'outline'
                        }
                      >
                        {t(`status.${row.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="grid gap-2 whitespace-normal">
                      <ul className="text-destructive grid gap-1 text-sm">
                        {row.issues.map((issue, index) => (
                          <li key={index}>
                            {issue.column !== null &&
                              `${headers[issue.column]?.trim() || '#' + (issue.column + 1)}: `}
                            {tIssues(issueKey(issue.message))}
                          </li>
                        ))}
                      </ul>
                      {(row.status === 'conflict' ||
                        choice?.action === 'update' ||
                        choice?.action === 'addAsNew') && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            items={choiceItems(row)}
                            value={choice?.action ?? 'skip'}
                            onValueChange={value => {
                              if (
                                value === 'skip' ||
                                value === 'update' ||
                                value === 'addAsNew'
                              ) {
                                choose(row, value);
                              }
                            }}
                          >
                            <SelectTrigger
                              aria-label={`${t('table.details')} ${row.sheetRow}`}
                              className="w-72"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {choiceItems(row).map(item => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {choice?.action === 'addAsNew' && (
                            <Input
                              aria-label={`${t('choice.newCode')} ${row.sheetRow}`}
                              className="w-40 font-mono"
                              value={choice.code}
                              onChange={event =>
                                onChoicesChange({
                                  ...choices,
                                  [row.sheetRow]: {
                                    action: 'addAsNew',
                                    code: event.target.value
                                  }
                                })
                              }
                            />
                          )}
                          {row.action === 'update' && row.changes > 0 && (
                            <span className="text-muted-foreground text-sm">
                              {t('choice.changes', { count: row.changes })}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        {!report.isReady && (
          <p className="text-muted-foreground text-sm">{t('cannotImport')}</p>
        )}
        <Button
          type="button"
          disabled={!report.isReady || isImporting}
          onClick={onImport}
        >
          {isImporting ? t('submitting') : t('submit')}
        </Button>
      </div>
    </div>
  );
};
