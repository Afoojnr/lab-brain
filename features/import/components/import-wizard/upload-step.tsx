'use client';

import { UploadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { toast } from 'sonner';

import { parseSpreadsheet } from '../../parsers';
import type { ParsedSheet } from '../../types';

type UploadStepProps = {
  onParsed: (sheets: ParsedSheet[]) => void;
};

/** Step 1: drop or pick a file. It is parsed in the browser and never sent as a file. */
export const UploadStep = ({ onParsed }: UploadStepProps) => {
  const t = useTranslations('import');
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const read = async (file: File) => {
    setIsReading(true);
    const result = await parseSpreadsheet(file);
    setIsReading(false);

    if (!result.isOk) {
      toast.error(t(`errors.${result.failure}`));
      return;
    }
    const sheets = result.sheets.filter(sheet => sheet.rows.length > 0);
    if (sheets.length === 0) {
      toast.error(t('errors.noRows'));
      return;
    }

    onParsed(sheets);
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void read(file);
    // So choosing the same file again after an error still fires.
    event.target.value = '';
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !isReading) void read(file);
  };

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">{t('upload.description')}</p>
      <label
        data-dragging={isDragging}
        className="hover:bg-muted/50 focus-within:border-ring focus-within:ring-ring/50 data-[dragging=true]:border-primary data-[dragging=true]:bg-muted flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:ring-3"
        onDragOver={event => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={drop}
      >
        <UploadIcon aria-hidden className="text-muted-foreground size-8" />
        <span className="font-medium">
          {isReading ? t('upload.reading') : t('upload.dropTitle')}
        </span>
        <span className="text-muted-foreground text-sm">
          {t('upload.dropBrowse')}
        </span>
        <span className="text-muted-foreground text-xs">
          {t('upload.dropHint')}
        </span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          aria-label={t('upload.fileLabel')}
          disabled={isReading}
          className="sr-only"
          onChange={choose}
        />
      </label>
    </div>
  );
};
