'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { FileDropZone } from '@/components/file-drop-zone';
import type { PickedFile } from '@/components/read-dropped-entries';
import { Button } from '@/components/ui/button';

import { defaultFtirSettings } from '../techniques/ftir/defaults';
import { parseSpectrum } from '../techniques/ftir/parse';
import type { FtirBond, FtirSettings } from '../techniques/ftir/types';
import { isFtirFile, readTextFiles } from '../upload/read-files';
import { FtirWorkbench } from './ftir-workbench';

type Read = ReturnType<typeof parseSpectrum>;

/**
 * FTIR spectra that are not in any experiment: drop one or more exports, stack
 * them to compare, detect and curate peaks, and download the value at each peak
 * as Excel. The files are read in the browser; nothing is uploaded.
 */
export const UploadFtir = ({ bonds }: { bonds?: FtirBond[] }) => {
  const t = useTranslations('analysis.workspace.upload');
  const tFtir = useTranslations('analysis.ftir');
  const [files, setFiles] = useState<{ name: string; read: Read }[] | null>(
    null
  );
  const [settings, setSettings] = useState<FtirSettings>(defaultFtirSettings);
  const [isReading, setIsReading] = useState(false);

  const spectra = useMemo(
    () =>
      (files ?? []).flatMap(file =>
        file.read.isOk
          ? [{ id: file.name, label: file.name, points: file.read.points }]
          : []
      ),
    [files]
  );
  const unreadable = (files ?? []).filter(file => !file.read.isOk);

  const read = async (picked: PickedFile[]) => {
    setIsReading(true);
    const texts = await readTextFiles(picked, isFtirFile);
    setIsReading(false);
    setFiles(
      texts.map(item => ({ name: item.path, read: parseSpectrum(item.text) }))
    );
    setSettings(defaultFtirSettings());
  };

  if (!files) {
    return (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">{t('ftirDescription')}</p>
        <FileDropZone
          isMultiple
          accept=".csv,.txt,.dpt,.dat"
          isDisabled={isReading}
          inputLabel={t('fileInputLabel')}
          title={t('dropTitleFiles')}
          browse={t('dropBrowse')}
          hint={t('dropHintFtir')}
          onFiles={picked => void read(picked)}
        />
      </div>
    );
  }

  const startOver = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setFiles(null)}
    >
      {t('startOver')}
    </Button>
  );

  return (
    <div className="grid min-w-0 gap-6">
      {unreadable.length > 0 && (
        <div role="alert" className="text-destructive grid gap-1 text-sm">
          <p>{tFtir('unreadableTitle')}</p>
          <ul className="list-disc pl-5">
            {unreadable.map(file => (
              <li key={file.name}>
                {file.name}:{' '}
                {file.read.isOk
                  ? ''
                  : tFtir(`reasons.${file.read.reason}`, {
                      line: file.read.line ?? 0
                    })}
              </li>
            ))}
          </ul>
        </div>
      )}
      {spectra.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground text-sm">{t('noFtirFiles')}</p>
          {startOver}
        </div>
      ) : (
        <FtirWorkbench
          spectra={spectra}
          settings={settings}
          onChange={setSettings}
          actions={startOver}
          bonds={bonds}
        />
      )}
    </div>
  );
};
