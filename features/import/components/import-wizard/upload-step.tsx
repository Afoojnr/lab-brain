'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { FileDropZone } from '@/components/file-drop-zone';

import { parseSpreadsheet } from '@/lib/spreadsheet/parsers';
import type { ParsedSheet } from '../../types';

type UploadStepProps = {
  onParsed: (sheets: ParsedSheet[]) => void;
};

/** Step 1: drop or pick a file. It is parsed in the browser and never sent as a file. */
export const UploadStep = ({ onParsed }: UploadStepProps) => {
  const t = useTranslations('import');
  const [isReading, setIsReading] = useState(false);

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

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">{t('upload.description')}</p>
      <FileDropZone
        accept=".xlsx,.xls,.csv"
        isDisabled={isReading}
        inputLabel={t('upload.fileLabel')}
        title={isReading ? t('upload.reading') : t('upload.dropTitle')}
        browse={t('upload.dropBrowse')}
        hint={t('upload.dropHint')}
        onFiles={files => {
          const file = files[0]?.file;
          if (file) void read(file);
        }}
      />
    </div>
  );
};
