import {
  DownloadIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FolderIcon
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import {
  FileViewer,
  ViewFileTrigger
} from '@/components/file-viewer/file-viewer';
import { isViewable, viewerKind } from '@/components/file-viewer/kinds';
import type { ViewerKind } from '@/components/file-viewer/kinds';

import { formatFileSize } from '../datasets';
import type { Dataset } from '../types';
import { DeleteDatasetDialog } from './delete-dataset-dialog';

type DatasetListProps = {
  projectId: string;
  experimentId: string;
  sampleId: string;
  characterizationId: string;
  datasets: Dataset[];
};

type Ids = Omit<DatasetListProps, 'datasets'>;

const urlOf = (dataset: Dataset) => `/api/datasets/${dataset.id}`;
// A TIFF is shown through a PNG copy; everything else is shown as it is.
const previewUrlOf = (dataset: Dataset, width: number) =>
  `${urlOf(dataset)}?preview=png&w=${width}`;

const KindIcon = ({ kind }: { kind: ViewerKind }) => {
  const className = 'text-muted-foreground mt-0.5 size-5 shrink-0';
  if (kind === 'csv' || kind === 'sheet') {
    return <FileSpreadsheetIcon aria-hidden className={className} />;
  }

  return kind === 'text' ? (
    <FileTextIcon aria-hidden className={className} />
  ) : (
    <FileIcon aria-hidden className={className} />
  );
};

/** One attached file: a thumbnail for an image, an icon for the rest, its size and location, view, download and remove. */
const DatasetItem = async ({
  dataset,
  ids
}: {
  dataset: Dataset;
  ids: Ids;
}) => {
  const t = await getTranslations('characterizations.files');
  const kind = viewerKind(dataset.fileName, dataset.sizeBytes);
  const isImage = kind === 'image' || kind === 'tiff';
  // Inside an uploaded folder the path says which file it is (many are named alike).
  const label = dataset.relativePath ?? dataset.fileName;
  const open = t('open', { name: dataset.fileName });

  return (
    <li className="flex items-start gap-3">
      {isImage ? (
        <ViewFileTrigger id={dataset.id} label={open}>
          {/* A stored file served by our own route, so next/image's optimiser does not apply. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={kind === 'tiff' ? previewUrlOf(dataset, 320) : urlOf(dataset)}
            alt={dataset.fileName}
            loading="lazy"
            className="h-20 w-auto max-w-40 rounded border object-cover"
          />
        </ViewFileTrigger>
      ) : (
        <KindIcon kind={kind} />
      )}
      <div className="min-w-0 flex-1 text-sm">
        {isViewable(kind) ? (
          <ViewFileTrigger
            id={dataset.id}
            label={open}
            className="text-left font-medium break-words underline-offset-4 hover:underline"
          >
            {label}
          </ViewFileTrigger>
        ) : (
          <a
            href={urlOf(dataset)}
            aria-label={t('download', { name: dataset.fileName })}
            className="font-medium break-words underline-offset-4 hover:underline"
          >
            {label}
          </a>
        )}
        <p className="text-muted-foreground text-xs break-words">
          {formatFileSize(dataset.sizeBytes)} ·{' '}
          {t('storedAt', { path: dataset.storagePath })}
        </p>
      </div>
      {isViewable(kind) && (
        <a
          href={urlOf(dataset)}
          aria-label={t('download', { name: dataset.fileName })}
          className="text-muted-foreground hover:text-foreground mt-0.5"
        >
          <DownloadIcon aria-hidden className="size-4" />
        </a>
      )}
      <DeleteDatasetDialog {...ids} dataset={dataset} />
    </li>
  );
};

/**
 * The files attached to one characterization. Loose files come first; a
 * folder that was uploaded is one collapsed row ("ABC130 · 47 files") that
 * opens to its files, each named by its path inside the folder. Images,
 * tables and text open in a viewer instead of a new window.
 */
export const DatasetList = async ({ datasets, ...ids }: DatasetListProps) => {
  const t = await getTranslations('characterizations.files');
  // `!folder`, not `=== null`: a record made before folders existed has none at all.
  const loose = datasets.filter(dataset => !dataset.folder);
  const folders = new Map<string, Dataset[]>();
  for (const dataset of datasets) {
    if (!dataset.folder) continue;
    folders.set(dataset.folder, [
      ...(folders.get(dataset.folder) ?? []),
      dataset
    ]);
  }
  const items = datasets.flatMap(dataset => {
    const kind = viewerKind(dataset.fileName, dataset.sizeBytes);

    return isViewable(kind)
      ? [
          {
            id: dataset.id,
            label: dataset.relativePath ?? dataset.fileName,
            url: urlOf(dataset),
            previewUrl: previewUrlOf(dataset, 2000),
            kind
          }
        ]
      : [];
  });

  return (
    <FileViewer items={items}>
      <div className="grid gap-3">
        {loose.length > 0 && (
          <ul className="grid gap-3">
            {loose.map(dataset => (
              <DatasetItem key={dataset.id} dataset={dataset} ids={ids} />
            ))}
          </ul>
        )}
        {[...folders.entries()].map(([name, files]) => (
          <details key={name} className="rounded-lg border">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium">
              <FolderIcon
                aria-hidden
                className="text-muted-foreground size-4"
              />
              {t('folderSummary', { name, count: files.length })}
            </summary>
            <ul className="grid gap-3 border-t p-3">
              {files.map(dataset => (
                <DatasetItem key={dataset.id} dataset={dataset} ids={ids} />
              ))}
            </ul>
          </details>
        ))}
      </div>
    </FileViewer>
  );
};
