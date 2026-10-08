'use client';

import { UploadIcon } from 'lucide-react';
import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

import { isHiddenName, readDroppedEntries } from './read-dropped-entries';
import type { PickedFile } from './read-dropped-entries';

type FileDropZoneProps = {
  /** Called with the chosen or dropped files, each with its path inside a folder. */
  onFiles: (files: PickedFile[]) => void;
  /** Pick or drop a whole folder (its subfolders are kept in each file's path). */
  isFolder?: boolean;
  /** Extensions to offer in the picker, e.g. `.xlsx,.csv`; omit for any file. */
  accept?: string;
  isMultiple?: boolean;
  isDisabled?: boolean;
  /** Accessible name of the hidden file input. */
  inputLabel: string;
  title: string;
  browse: string;
  hint: string;
};

/**
 * A dashed area to drop files on or click to browse. Only hands the files to
 * `onFiles`; what to do with them (and which are acceptable) is up to the caller.
 */
export const FileDropZone = ({
  onFiles,
  accept,
  isFolder = false,
  isMultiple = false,
  isDisabled = false,
  inputLabel,
  title,
  browse,
  hint
}: FileDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
      .filter(file => !isHiddenName(file.name))
      .map(file => ({ file, path: file.webkitRelativePath || file.name }));
    if (files.length > 0) onFiles(files);
    // So choosing the same file again after an error still fires.
    event.target.value = '';
  };

  const drop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;

    const entries = Array.from(event.dataTransfer.items ?? [])
      .map(item => item.webkitGetAsEntry?.())
      .filter(entry => entry != null);
    const picked: PickedFile[] =
      isFolder && entries.length > 0
        ? await readDroppedEntries(entries)
        : Array.from(event.dataTransfer.files)
            .filter(file => !isHiddenName(file.name))
            .map(file => ({ file, path: file.name }));
    if (picked.length > 0) {
      onFiles(isMultiple || isFolder ? picked : picked.slice(0, 1));
    }
  };

  return (
    <label
      data-dragging={isDragging}
      className="hover:bg-muted/50 focus-within:border-ring focus-within:ring-ring/50 data-[dragging=true]:border-primary data-[dragging=true]:bg-muted flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:ring-3"
      onDragOver={event => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={event => void drop(event)}
    >
      <UploadIcon aria-hidden className="text-muted-foreground size-8" />
      <span className="font-medium">{title}</span>
      <span className="text-muted-foreground text-sm">{browse}</span>
      <span className="text-muted-foreground text-xs">{hint}</span>
      <input
        type="file"
        accept={accept}
        multiple={isMultiple}
        {...(isFolder ? { webkitdirectory: '' } : {})}
        aria-label={inputLabel}
        disabled={isDisabled}
        className="sr-only"
        onChange={choose}
      />
    </label>
  );
};
