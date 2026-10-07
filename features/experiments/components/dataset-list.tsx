import { FileIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { formatFileSize, isInlineImage } from '../datasets';
import type { Dataset } from '../types';
import { DeleteDatasetDialog } from './delete-dataset-dialog';

type DatasetListProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterizationId: string;
  datasets: Dataset[];
};

/**
 * The files attached to one characterization: images as thumbnails that open
 * full size, other files as a download link, each with its size, where it is
 * stored and a remove button.
 */
export const DatasetList = async ({ datasets, ...ids }: DatasetListProps) => {
  const t = await getTranslations('characterizations.files');

  return (
    <ul className="grid gap-3">
      {datasets.map(dataset => {
        const url = `/api/datasets/${dataset.id}`;
        const isImage = isInlineImage(dataset.contentType);

        return (
          <li key={dataset.id} className="flex items-start gap-3">
            {isImage ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-label={t('open', { name: dataset.fileName })}
              >
                {/* A stored file served by our own route, so next/image's optimiser does not apply. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={dataset.fileName}
                  className="h-20 w-auto max-w-40 rounded border object-cover"
                />
              </a>
            ) : (
              <FileIcon
                aria-hidden
                className="text-muted-foreground mt-0.5 size-5"
              />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <a
                href={url}
                {...(isImage ? { target: '_blank', rel: 'noreferrer' } : {})}
                aria-label={
                  isImage
                    ? t('open', { name: dataset.fileName })
                    : t('download', { name: dataset.fileName })
                }
                className="font-medium break-words underline-offset-4 hover:underline"
              >
                {dataset.fileName}
              </a>
              <p className="text-muted-foreground text-xs">
                {formatFileSize(dataset.sizeBytes)} ·{' '}
                {t('storedAt', { path: dataset.storagePath })}
              </p>
            </div>
            <DeleteDatasetDialog {...ids} dataset={dataset} />
          </li>
        );
      })}
    </ul>
  );
};
