'use client';

import { PaperclipIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { FileDropZone } from '@/components/file-drop-zone';
import type { PickedFile } from '@/components/read-dropped-entries';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

import { reserveDatasetFolderAction } from '../actions/reserve-dataset-folder';
import { uploadDatasetAction } from '../actions/upload-dataset';
import { MAX_DATASET_BYTES } from '../datasets';

type AttachFilesDialogProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterization: { id: string; technique: string };
};

/** A paperclip button that opens a drop zone to attach files, or a whole folder, to one characterization. */
export const AttachFilesDialog = ({
  projectId,
  experimentId,
  sampleId,
  characterization
}: AttachFilesDialogProps) => {
  const t = useTranslations('characterizations.files');
  const tErrors = useTranslations('errors');
  const [isOpen, setIsOpen] = useState(false);
  const [isFolder, setIsFolder] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const attach = async (picked: PickedFile[]) => {
    // Too large files are refused here, before sending, with their name.
    const accepted = picked.filter(({ file }) => {
      if (file.size <= MAX_DATASET_BYTES) return true;
      toast.error(t('errors.tooLarge', { name: file.name }));
      return false;
    });
    if (accepted.length === 0) return;

    // A folder keeps its subfolders: its name is reserved once, then each file
    // is sent with its path inside the folder.
    const folderName = isFolder ? (accepted[0]?.path.split('/')[0] ?? '') : '';
    let reserved: string | null = null;
    if (isFolder) {
      reserved = await reserveDatasetFolderAction(
        projectId,
        experimentId,
        sampleId,
        characterization.id,
        folderName
      ).catch(() => null);
      if (!reserved) {
        toast.error(t('errors.uploadFailed', { name: folderName }));
        return;
      }
    }

    let attached = 0;
    for (const [index, { file, path }] of accepted.entries()) {
      setProgress({ current: index + 1, total: accepted.length });
      const form = new FormData();
      form.set('file', file);
      if (reserved) {
        form.set('folder', reserved);
        // The path inside the folder, without the folder's own name.
        form.set(
          'relativePath',
          path.split('/').slice(1).join('/') || file.name
        );
      }
      // Only the last file re-renders the page; the others would repeat the work.
      if (index < accepted.length - 1) form.set('refresh', '0');
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
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={isFolder ? 'outline' : 'default'}
            aria-pressed={!isFolder}
            disabled={progress !== null}
            onClick={() => setIsFolder(false)}
          >
            {t('modeFiles')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isFolder ? 'default' : 'outline'}
            aria-pressed={isFolder}
            disabled={progress !== null}
            onClick={() => setIsFolder(true)}
          >
            {t('modeFolder')}
          </Button>
        </div>
        <FileDropZone
          key={isFolder ? 'folder' : 'files'}
          isMultiple
          isFolder={isFolder}
          isDisabled={progress !== null}
          inputLabel={isFolder ? t('folderInputLabel') : t('fileInputLabel')}
          title={
            progress
              ? t('uploading', {
                  current: progress.current,
                  total: progress.total
                })
              : isFolder
                ? t('dropFolderTitle')
                : t('dropTitle')
          }
          browse={t('dropBrowse')}
          hint={isFolder ? t('dropFolderHint') : t('dropHint')}
          onFiles={files => void attach(files)}
        />
      </DialogContent>
    </Dialog>
  );
};
