'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

import {
  previewCsv,
  previewText,
  previewWorkbook,
  PREVIEW_ROWS,
  TEXT_PREVIEW_LINES
} from './parse-table';
import type { TablePreview } from './parse-table';
import type { ViewerKind } from './kinds';

export type ViewerItem = {
  id: string;
  /** Shown as the title; for a file in a folder, its path inside it. */
  label: string;
  /** The file itself (downloads the original). */
  url: string;
  /** For a TIFF: a PNG copy the browser can show. */
  previewUrl: string;
  kind: ViewerKind;
};

type Loaded =
  | { type: 'tables'; tables: TablePreview[] }
  | { type: 'text'; text: string; totalLines: number }
  | { type: 'failed' };

/** Fetches a table or text file and reads its first rows, once per file. */
const useLoaded = (item: ViewerItem): Loaded | null => {
  const [loaded, setLoaded] = useState<{ id: string; value: Loaded } | null>(
    null
  );

  useEffect(() => {
    if (item.kind !== 'csv' && item.kind !== 'sheet' && item.kind !== 'text') {
      return;
    }
    let isCurrent = true;
    const load = async (): Promise<Loaded> => {
      const response = await fetch(item.url);
      if (!response.ok) return { type: 'failed' };

      if (item.kind === 'sheet') {
        return {
          type: 'tables',
          tables: previewWorkbook(await response.arrayBuffer())
        };
      }
      const text = await response.text();
      if (item.kind === 'csv') {
        return { type: 'tables', tables: [previewCsv(text)] };
      }
      const preview = previewText(text);

      return { type: 'text', ...preview };
    };

    load()
      .catch((): Loaded => ({ type: 'failed' }))
      .then(value => {
        if (isCurrent) setLoaded({ id: item.id, value });
      });

    return () => {
      isCurrent = false;
    };
  }, [item.id, item.kind, item.url]);

  return loaded?.id === item.id ? loaded.value : null;
};

const TableView = ({ tables }: { tables: TablePreview[] }) => {
  const t = useTranslations('common.fileViewer');
  const [active, setActive] = useState(0);
  const table = tables[active] ?? tables[0];
  if (!table || table.rows.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('empty')}</p>;
  }

  return (
    <div className="grid min-w-0 gap-2">
      {tables.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {tables.map((sheet, index) => (
            <Button
              key={sheet.name ?? index}
              type="button"
              size="xs"
              variant={index === active ? 'default' : 'outline'}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            >
              {t('sheet', { name: sheet.name ?? index + 1 })}
            </Button>
          ))}
        </div>
      )}
      <div className="max-h-[60vh] overflow-auto rounded border">
        <Table>
          <TableBody>
            {table.rows.map((row, index) => (
              <TableRow key={index}>
                {row.map((cell, column) => (
                  <TableCell key={column} className="whitespace-nowrap">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {table.totalRows > PREVIEW_ROWS && (
        <p className="text-muted-foreground text-xs">
          {t('rows', { shown: PREVIEW_ROWS, total: table.totalRows })}
        </p>
      )}
    </div>
  );
};

/** The file's content for the viewer dialog: an image, a table or text. */
export const ViewerBody = ({ item }: { item: ViewerItem }) => {
  const t = useTranslations('common.fileViewer');
  const loaded = useLoaded(item);

  if (item.kind === 'image' || item.kind === 'tiff') {
    return (
      // A stored file served by our own route, so next/image's optimiser does not apply.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.kind === 'tiff' ? item.previewUrl : item.url}
        alt={item.label}
        className="mx-auto max-h-[70vh] w-auto max-w-full rounded object-contain"
      />
    );
  }
  if (!loaded) {
    return (
      <p role="status" className="text-muted-foreground text-sm">
        {t('loading')}
      </p>
    );
  }
  if (loaded.type === 'failed') {
    return <p className="text-destructive text-sm">{t('loadFailed')}</p>;
  }
  if (loaded.type === 'tables') return <TableView tables={loaded.tables} />;

  return (
    <div className="grid gap-2">
      <pre className="max-h-[60vh] overflow-auto rounded border p-3 text-xs">
        {loaded.text}
      </pre>
      {loaded.totalLines > TEXT_PREVIEW_LINES && (
        <p className="text-muted-foreground text-xs">
          {t('lines', { shown: TEXT_PREVIEW_LINES, total: loaded.totalLines })}
        </p>
      )}
    </div>
  );
};
