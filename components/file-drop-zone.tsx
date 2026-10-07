'use client';

import { UploadIcon } from 'lucide-react';
import { useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';

type FileDropZoneProps = {
  /** Called with the chosen or dropped files. */
  onFiles: (files: File[]) => void;
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
  isMultiple = false,
  isDisabled = false,
  inputLabel,
  title,
  browse,
  hint
}: FileDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onFiles(files);
    // So choosing the same file again after an error still fires.
    event.target.value = '';
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;

    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles(isMultiple ? files : files.slice(0, 1));
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
      onDrop={drop}
    >
      <UploadIcon aria-hidden className="text-muted-foreground size-8" />
      <span className="font-medium">{title}</span>
      <span className="text-muted-foreground text-sm">{browse}</span>
      <span className="text-muted-foreground text-xs">{hint}</span>
      <input
        type="file"
        accept={accept}
        multiple={isMultiple}
        aria-label={inputLabel}
        disabled={isDisabled}
        className="sr-only"
        onChange={choose}
      />
    </label>
  );
};
