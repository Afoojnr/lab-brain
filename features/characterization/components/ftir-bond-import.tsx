'use client';

import { DownloadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { FileDropZone } from '@/components/file-drop-zone';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { CSV_TYPE, downloadBytes } from '@/lib/download-file';
import { cellToText } from '@/lib/spreadsheet/cells';
import { parseCsvText } from '@/lib/spreadsheet/parsers/csv-parser';
import { parseSpreadsheet } from '@/lib/spreadsheet/parsers';

import { importBondsAction } from '../actions/ftir-bonds';
import { BOND_TEMPLATE, parseBondRows } from '../techniques/ftir/bonds';
import type { BondRows } from '../techniques/ftir/bonds';
import type { FtirBond } from '../techniques/ftir/types';

/**
 * Paste a table (from Excel, or CSV text) or import a CSV or Excel file, see
 * what would be added and which rows cannot be used and why, then add them to
 * the table or replace it. Replacing asks again, and nothing is changed until
 * a button is pressed. The files are read in the browser.
 */
export const FtirBondImport = ({ bonds }: { bonds: FtirBond[] }) => {
  const t = useTranslations('analysis.ftir.bonds.import');
  const tErrors = useTranslations('errors');
  const [text, setText] = useState('');
  const [read, setRead] = useState<BondRows | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const show = (table: string[][]) => {
    setRead(parseBondRows(table, bonds));
    setIsConfirming(false);
  };

  const readText = () =>
    show(parseCsvText(text, 'paste').rows.map(row => row.map(cellToText)));

  const readFile = async (file: File) => {
    const result = await parseSpreadsheet(file);
    if (!result.isOk || !result.sheets[0]) {
      toast.error(t('fileFailed'));
      return;
    }
    show(result.sheets[0].rows.map(row => row.map(cellToText)));
  };

  const save = (mode: 'add' | 'replace') =>
    startTransition(async () => {
      if (!read) return;
      try {
        const result = await importBondsAction({ mode, bonds: read.bonds });
        if (!result.ok) {
          toast.error(t('failed'));
          return;
        }

        toast.success(
          t(mode === 'add' ? 'added' : 'replaced', {
            count: mode === 'add' ? read.bonds.length : (result.count ?? 0)
          })
        );
        setRead(null);
        setText('');
        setIsConfirming(false);
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h3 className="font-medium">{t('title')}</h3>
        <p className="text-muted-foreground max-w-2xl text-sm">{t('format')}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() =>
            downloadBytes(
              'ftir-bond-table-template.csv',
              new TextEncoder().encode(BOND_TEMPLATE),
              CSV_TYPE
            )
          }
        >
          <DownloadIcon aria-hidden />
          {t('template')}
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="bond-paste">{t('paste')}</FieldLabel>
          <Textarea
            id="bond-paste"
            rows={6}
            value={text}
            placeholder={t('pastePlaceholder')}
            onChange={event => setText(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            disabled={text.trim() === ''}
            onClick={readText}
          >
            {t('read')}
          </Button>
        </Field>
        <FileDropZone
          accept=".csv,.xlsx,.xls"
          inputLabel={t('fileLabel')}
          title={t('dropTitle')}
          browse={t('browse')}
          hint=".csv, .xlsx"
          onFiles={([picked]) => void readFile(picked.file)}
        />
      </div>

      {read && (
        <div className="grid gap-3">
          {read.problems.length > 0 && (
            <div role="alert" className="text-destructive grid gap-1 text-sm">
              <p>{t('problemsTitle')}</p>
              <ul className="list-disc pl-5">
                {read.problems.map((problem, index) => (
                  <li key={`${problem.row}-${index}`}>
                    {t(`problems.${problem.reason}`, {
                      row: problem.row,
                      column: problem.column ?? '',
                      value: problem.value ?? ''
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {read.bonds.length > 0 && (
            <>
              <p className="text-sm">
                {t('ready', { count: read.bonds.length })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={() => save('add')}
                >
                  {t('addButton', { count: read.bonds.length })}
                </Button>
                {isConfirming ? (
                  <>
                    <span className="text-sm">
                      {t('confirmReplace', { existing: bonds.length })}
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => save('replace')}
                    >
                      {t('confirmYes')}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending || bonds.length === 0}
                    onClick={() => setIsConfirming(true)}
                  >
                    {t('replaceButton', { count: read.bonds.length })}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};
