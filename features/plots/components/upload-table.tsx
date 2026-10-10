'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { FileDropZone } from '@/components/file-drop-zone';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { detectHeaderRow } from '@/lib/spreadsheet/layout';
import { parseSpreadsheet } from '@/lib/spreadsheet/parsers';
import type { ParsedSheet } from '@/lib/spreadsheet/types';

import { tableFromSheet } from '../from-table';
import { PlotView } from './plot-view';

/**
 * Plots a CSV or Excel table that is not in any experiment. The file is read in
 * the browser; nothing is uploaded or saved. The header row is found
 * automatically and can be changed.
 */
export const UploadTable = () => {
  const t = useTranslations('plots.upload');
  const tErrors = useTranslations('import.errors');
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [headerRow, setHeaderRow] = useState(0);
  const [isReading, setIsReading] = useState(false);

  const sheet = sheets[sheetIndex];
  const table = useMemo(
    () => (sheet ? tableFromSheet(sheet, headerRow) : null),
    [sheet, headerRow]
  );

  const read = async (file: File) => {
    setIsReading(true);
    const result = await parseSpreadsheet(file);
    setIsReading(false);
    if (!result.isOk) {
      toast.error(tErrors(result.failure));
      return;
    }

    setFileName(file.name);
    setSheets(result.sheets);
    setSheetIndex(0);
    setHeaderRow(detectHeaderRow(result.sheets[0]?.rows ?? []));
  };

  if (!sheet || !table) {
    return (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">{t('description')}</p>
        <FileDropZone
          accept=".csv,.xlsx,.xls"
          isDisabled={isReading}
          inputLabel={t('inputLabel')}
          title={t('dropTitle')}
          browse={t('dropBrowse')}
          hint={t('dropHint')}
          onFiles={([first]) => void read(first.file)}
        />
      </div>
    );
  }

  const sheetItems = sheets.map((item, index) => ({
    value: String(index),
    label: item.name
  }));

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <p className="text-sm font-medium">{fileName}</p>
        {sheets.length > 1 && (
          <Field className="w-full sm:w-52">
            <FieldLabel htmlFor="plot-sheet">{t('sheet')}</FieldLabel>
            <Select
              items={sheetItems}
              value={String(sheetIndex)}
              onValueChange={value => {
                if (value === null) return;
                const next = Number(value);
                setSheetIndex(next);
                setHeaderRow(detectHeaderRow(sheets[next]?.rows ?? []));
              }}
            >
              <SelectTrigger id="plot-sheet" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sheetItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field className="w-full sm:w-28">
          <FieldLabel htmlFor="plot-header-row">{t('headerRow')}</FieldLabel>
          <Input
            id="plot-header-row"
            type="number"
            min={1}
            max={Math.max(sheet.rows.length, 1)}
            value={headerRow + 1}
            onChange={event => {
              const row = Math.trunc(Number(event.target.value));
              if (row >= 1 && row <= sheet.rows.length) setHeaderRow(row - 1);
            }}
          />
        </Field>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSheets([]);
            setFileName(null);
          }}
        >
          {t('startOver')}
        </Button>
      </div>
      <PlotView
        // A new sheet or header row has other columns; start its settings fresh.
        key={`${fileName}:${sheetIndex}:${headerRow}`}
        table={table}
        canGroupByStudy={false}
        sourceLabel={
          sheets.length > 1
            ? `${fileName} · ${sheet.name}`
            : (fileName ?? undefined)
        }
        notEnoughNumbers={t('tooFewNumbers')}
      />
    </div>
  );
};
