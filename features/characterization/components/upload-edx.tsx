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
import {
  groupEdxItems,
  looksLikeDateFolder
} from '../techniques/edx/from-files';
import type { TextFile } from '../techniques/edx/from-files';
import { DEFAULT_ELEMENTS } from '../techniques/edx/stats';
import { downloadBytes, XLSX_TYPE } from '@/lib/download-file';
import { isEdxFile, readTextFiles } from '../upload/read-files';
import { buildWorkbook, edxSummary } from '../upload/summary-rows';
import { EdxRatioSelects } from './edx-ratio-selects';
import { EdxSpotsView } from './edx-spots-view';

/**
 * EDX from raw files that are not in any experiment: drop one or more sample
 * folders (or a day's folder holding them), see each sample's values like the
 * lab notebook's summary, untick bad spots, and download the table as Excel.
 * The files are read in the browser; nothing is uploaded or saved.
 */
export const UploadEdx = () => {
  const t = useTranslations('analysis.workspace.upload');
  const tProblems = useTranslations('analysis.edx');
  const [files, setFiles] = useState<TextFile[] | null>(null);
  const [level, setLevel] = useState<0 | 1>(0);
  const [ratio, setRatio] = useState({ numerator: 'B', denominator: 'N' });
  const [excluded, setExcluded] = useState<Record<string, string[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const items = useMemo(
    () => (files ? groupEdxItems(files, level) : []),
    [files, level]
  );
  const table = useMemo(
    () => edxSummary(items, { ...ratio, excludedSpots: excluded }),
    [items, ratio, excluded]
  );
  const elements = useMemo(
    () =>
      [
        ...new Set([
          ...DEFAULT_ELEMENTS,
          ...items.flatMap(item =>
            item.spots.flatMap(spot => Object.keys(spot.atomic))
          ),
          ratio.numerator,
          ratio.denominator
        ])
      ].sort(),
    [items, ratio]
  );
  const problems = items.flatMap(item => item.problems);

  const read = async (picked: PickedFile[]) => {
    setIsReading(true);
    const read = await readTextFiles(picked, isEdxFile);
    setIsReading(false);

    const tops = picked.map(({ path }) => path.split('/')[0] ?? '');
    setFiles(read);
    setExcluded({});
    setOpenId(null);
    // A day's folder holds the samples one level down.
    setLevel(tops.length > 0 && tops.every(looksLikeDateFolder) ? 1 : 0);
  };

  if (!files) {
    return (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">{t('edxDescription')}</p>
        <FileDropZone
          isFolder
          isMultiple
          isDisabled={isReading}
          inputLabel={t('folderInputLabel')}
          title={t('dropTitle')}
          browse={t('dropBrowse')}
          hint={t('dropHint')}
          onFiles={picked => void read(picked)}
        />
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{t('levelLabel')}</span>
          {([0, 1] as const).map(option => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={level === option ? 'default' : 'outline'}
              aria-pressed={level === option}
              onClick={() => {
                setLevel(option);
                setExcluded({});
                setOpenId(null);
              }}
            >
              {t(option === 0 ? 'levelSample' : 'levelDate')}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setFiles(null)}>
            {t('startOver')}
          </Button>
          <Button
            type="button"
            disabled={items.length === 0}
            onClick={() =>
              downloadBytes(
                'EDS_summary.xlsx',
                buildWorkbook(table, 'EDX'),
                XLSX_TYPE
              )
            }
          >
            <DownloadIcon aria-hidden />
            {t('download')}
          </Button>
        </div>
      </div>
      {problems.length > 0 && (
        <div role="alert" className="text-destructive grid gap-1 text-sm">
          <p>{t('problems')}</p>
          <ul className="list-disc pl-5">
            {problems.map(problem => (
              <li key={problem.file}>
                {problem.file}:{' '}
                {tProblems(
                  `reasons.${
                    problem.reason === 'missingColumns' ||
                    problem.reason === 'invalidNumber' ||
                    problem.reason === 'empty'
                      ? problem.reason
                      : 'unreadable'
                  }`
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noFiles')}</p>
      ) : (
        <>
          <EdxRatioSelects
            elements={elements}
            numerator={ratio.numerator}
            denominator={ratio.denominator}
            idPrefix="upload-edx"
            onChange={(numerator, denominator) =>
              setRatio({ numerator, denominator })
            }
          />
          <section className="grid min-w-0 gap-2">
            <h3 className="font-medium">
              {t('itemsTitle')}{' '}
              <span className="text-muted-foreground font-normal">
                ({t('count', { count: items.length })})
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
                {items.map((item, index) => {
                  const isOpen = openId === item.id;
                  const left = excluded[item.id] ?? [];

                  return (
                    <Fragment key={item.id}>
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
                                <span className="text-muted-foreground text-xs font-normal">
                                  {t('spotsOf', {
                                    included: item.spots.length - left.length,
                                    total: item.spots.length
                                  })}
                                </span>
                              </button>
                            ) : typeof cell === 'number' ? (
                              formatValue(cell)
                            ) : (
                              cell
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell
                            colSpan={table.headers.length}
                            className="whitespace-normal"
                          >
                            <EdxSpotsView
                              spots={item.spots}
                              problems={item.problems}
                              isRatioFixed
                              settings={{ ...ratio, excludedSpots: left }}
                              onChange={next =>
                                setExcluded(current => ({
                                  ...current,
                                  [item.id]: next.excludedSpots
                                }))
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </>
      )}
    </div>
  );
};
