'use client';

import { ChevronDownIcon, ChevronRightIcon, DownloadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment, useMemo, useState } from 'react';

import { FileDropZone } from '@/components/file-drop-zone';
import type { PickedFile } from '@/components/read-dropped-entries';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import { formatValue } from '../results';
import type { TextFile } from '../techniques/edx/from-files';
import { readSeqfitItems } from '../techniques/ellipsometry/from-files';
import { downloadBytes, XLSX_TYPE } from '../upload/download-file';
import { isCsvFile, readTextFiles } from '../upload/read-files';
import { buildWorkbook, ellipsometrySummary } from '../upload/summary-rows';
import { EllipsometrySummaryView } from './ellipsometry-summary-view';

/**
 * Ellipsometry from fit exports that are not in any experiment: drop one or
 * more `.csv` files, see each one's thickness and n with their std, and download
 * the table as Excel. The files are read in the browser; nothing is uploaded.
 */
export const UploadEllipsometry = () => {
  const t = useTranslations('analysis.workspace.upload');
  const [files, setFiles] = useState<TextFile[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const items = useMemo(() => (files ? readSeqfitItems(files) : []), [files]);
  const readable = items.filter(item => item.summary);
  const unreadable = items.filter(item => !item.summary);
  const table = useMemo(() => ellipsometrySummary(items), [items]);

  const read = async (picked: PickedFile[]) => {
    setIsReading(true);
    const read = await readTextFiles(picked, isCsvFile);
    setIsReading(false);
    setFiles(read);
    setOpenId(null);
  };

  if (!files) {
    return (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          {t('ellipsometryDescription')}
        </p>
        <FileDropZone
          isMultiple
          accept=".csv"
          isDisabled={isReading}
          inputLabel={t('fileInputLabel')}
          title={t('dropTitleFiles')}
          browse={t('dropBrowse')}
          hint={t('dropHintFiles')}
          onFiles={picked => void read(picked)}
        />
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setFiles(null)}>
          {t('startOver')}
        </Button>
        <Button
          type="button"
          disabled={readable.length === 0}
          onClick={() =>
            downloadBytes(
              'Ellipsometry_summary.xlsx',
              buildWorkbook(table, 'Ellipsometry'),
              XLSX_TYPE
            )
          }
        >
          <DownloadIcon aria-hidden />
          {t('download')}
        </Button>
      </div>
      {unreadable.length > 0 && (
        <div role="alert" className="text-destructive grid gap-1 text-sm">
          <p>{t('problems')}</p>
          <ul className="list-disc pl-5">
            {unreadable.map(item => (
              <li key={item.fileName}>
                {item.fileName}:{' '}
                {t(
                  `reasons.${item.reason === 'invalidNumber' ? 'invalidNumber' : 'notSeqfit'}`
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noCsv')}</p>
      ) : (
        readable.length > 0 && (
          <section className="grid min-w-0 gap-2">
            <h3 className="font-medium">
              {t('itemsTitle')}{' '}
              <span className="text-muted-foreground font-normal">
                ({t('count', { count: readable.length })})
              </span>
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  {table.headers.map(header => (
                    <TableHead key={header}>{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {readable.map((item, index) => {
                  const isOpen = openId === item.id;

                  return (
                    <Fragment key={item.fileName}>
                      <TableRow>
                        {table.rows[index]?.map((cell, column) => (
                          <TableCell key={column} className="tabular-nums">
                            {column === 0 ? (
                              <button
                                type="button"
                                aria-expanded={isOpen}
                                aria-label={t(
                                  isOpen ? 'spotsHide' : 'spotsToggle',
                                  {
                                    id: item.id
                                  }
                                )}
                                className="flex items-center gap-1 font-medium"
                                onClick={() =>
                                  setOpenId(isOpen ? null : item.id)
                                }
                              >
                                {isOpen ? (
                                  <ChevronDownIcon
                                    aria-hidden
                                    className="size-4"
                                  />
                                ) : (
                                  <ChevronRightIcon
                                    aria-hidden
                                    className="size-4"
                                  />
                                )}
                                {item.id}
                              </button>
                            ) : typeof cell === 'number' ? (
                              formatValue(cell)
                            ) : (
                              cell
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isOpen && item.summary && (
                        <TableRow>
                          <TableCell
                            colSpan={table.headers.length}
                            className="whitespace-normal"
                          >
                            <EllipsometrySummaryView summary={item.summary} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        )
      )}
    </div>
  );
};
