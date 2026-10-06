'use client';

import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel
} from '@/components/ui/field';
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

import { cellToText } from '../../cells';
import type { SheetLayout } from '../../build-payload';
import type { ParsedSheet } from '../../types';

const PREVIEW_ROWS = 10;

type LayoutStepProps = {
  sheets: ParsedSheet[];
  sheetIndex: number;
  layout: SheetLayout;
  onSheetChange: (index: number) => void;
  onLayoutChange: (layout: SheetLayout) => void;
};

/** Step 2: choose the sheet, say where the headers are, and whether a units row follows. */
export const LayoutStep = ({
  sheets,
  sheetIndex,
  layout,
  onSheetChange,
  onLayoutChange
}: LayoutStepProps) => {
  const t = useTranslations('import.layout');
  const sheet = sheets[sheetIndex];
  if (!sheet) return null;

  const rowCount = sheet.rows.length;
  const isHeaderValid =
    layout.headerRow >= 0 && layout.headerRow < rowCount - 1;
  const sheetItems = sheets.map((item, index) => ({
    value: String(index),
    label: item.name
  }));

  return (
    <div className="grid gap-6">
      <p className="text-muted-foreground text-sm">{t('description')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sheets.length > 1 && (
          <Field>
            <FieldLabel htmlFor="import-sheet">{t('sheetLabel')}</FieldLabel>
            <Select
              items={sheetItems}
              value={String(sheetIndex)}
              onValueChange={value => onSheetChange(Number(value))}
            >
              <SelectTrigger id="import-sheet" className="w-full">
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
        <Field data-invalid={!isHeaderValid}>
          <FieldLabel htmlFor="import-header-row">
            {t('headerRowLabel')}
          </FieldLabel>
          <Input
            id="import-header-row"
            type="number"
            min={1}
            max={rowCount - 1}
            className="w-28"
            aria-invalid={!isHeaderValid}
            value={layout.headerRow + 1}
            onChange={event =>
              onLayoutChange({
                ...layout,
                headerRow: Number(event.target.value) - 1
              })
            }
          />
          <FieldDescription>{t('headerRowHint')}</FieldDescription>
          {!isHeaderValid && <FieldError>{t('headerRowInvalid')}</FieldError>}
        </Field>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id="import-units-row"
          checked={layout.hasUnitsRow}
          onCheckedChange={isChecked =>
            onLayoutChange({ ...layout, hasUnitsRow: isChecked })
          }
        />
        <div className="grid gap-1">
          <Label htmlFor="import-units-row">{t('unitsLabel')}</Label>
          <p className="text-muted-foreground text-sm">{t('unitsHint')}</p>
        </div>
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-medium">{t('previewTitle')}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t('rowNumber')}</TableHead>
              {(sheet.rows[0] ?? []).map((_cell, column) => (
                <TableHead key={column} aria-hidden />
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sheet.rows.slice(0, PREVIEW_ROWS).map((row, index) => (
              <TableRow
                key={index}
                data-header={index === layout.headerRow}
                className="data-[header=true]:bg-muted data-[header=true]:font-medium"
              >
                <TableCell className="text-muted-foreground">
                  {index + 1}
                </TableCell>
                {row.map((cell, column) => (
                  <TableCell key={column} className="max-w-40 truncate">
                    {cellToText(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
