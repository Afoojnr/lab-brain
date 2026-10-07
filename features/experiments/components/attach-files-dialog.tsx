'use client';

import { PaperclipIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { FileDropZone } from '@/components/file-drop-zone';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

import { uploadDatasetAction } from '../actions/upload-dataset';
import { MAX_DATASET_BYTES } from '../datasets';

type AttachFilesDialogProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterization: { id: string; technique: string };
};

/** A paperclip button that opens a drop zone to attach files to one characterization. */
export const AttachFilesDialog = ({
  projectId,
  experimentId,
  sampleId,
  characterization
}: AttachFilesDialogProps) => {
  const t = useTranslations('characterizations.files');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const attach = async (files: File[]) => {
    // Too large files are refused here, before sending, with their name.
    const accepted = files.filter(file => {
      if (file.size <= MAX_DATASET_BYTES) return true;
      toast.error(t('errors.tooLarge', { name: file.name }));
      return false;
    });
    let attached = 0;

    for (const [index, file] of accepted.entries()) {
      setProgress({ current: index + 1, total: accepted.length });
      const form = new FormData();
      form.set('file', file);
      try {
        const id = await uploadDatasetAction(
          projectId,
          experimentId,
          sampleId,
          characterization.id,
          form
        );
        if (id) attached += 1;
        else toast.error(t('errors.uploadFailed', { name: file.name }));
      } catch {
        toast.error(tErrors('unexpected'));
      }
    }

    setProgress(null);
    if (attached > 0) {
      toast.success(t('uploaded', { count: attached }));
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('attach', { technique: characterization.technique })}
          />
        }
      >
        <PaperclipIcon aria-hidden />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('dialogTitle', { technique: characterization.technique })}
          </DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>
        <FileDropZone
          isMultiple
          isDisabled={progress !== null}
          inputLabel={t('fileInputLabel')}
          title={
            progress
              ? t('uploading', {
                  current: progress.current,
                  total: progress.total
                })
              : t('dropTitle')
          }
          browse={t('dropBrowse')}
          hint={t('dropHint')}
          onFiles={files => void attach(files)}
        />
      </DialogContent>
    </Dialog>
  );
};
