'use client';

import { UploadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  CSV_TYPE,
  downloadBytes,
  fileNameFor,
  XLSX_TYPE
} from '@/lib/export/download-file';

import { buildExperimentSheets } from '../export/export-workbook';
import type { ExportLabels } from '../export/export-workbook';
import type {
  Characterization,
  DerivedColumn,
  ParameterDefinition,
  Sample,
  Study
} from '../types';

type ExportSamplesMenuProps = {
  experimentName: string;
  definitions: ParameterDefinition[];
  derivedColumns: DerivedColumn[];
  derivedValues: Record<string, Record<string, number | null>>;
  studies: Study[];
  characterizations: Characterization[];
  /** The samples to export: the ticked ones, or everything shown. */
  samples: Sample[];
  /** Whether `samples` is a selection (it is named as such in the menu). */
  isSelection: boolean;
};

/** Saves the samples table as Excel (samples, columns, studies, measurements) or as CSV (samples only). */
export const ExportSamplesMenu = ({
  experimentName,
  definitions,
  derivedColumns,
  derivedValues,
  studies,
  characterizations,
  samples,
  isSelection
}: ExportSamplesMenuProps) => {
  const t = useTranslations('samples.export');
  const tErrors = useTranslations('errors');

  const labels: ExportLabels = {
    sheets: {
      samples: t('sheets.samples'),
      columns: t('sheets.columns'),
      studies: t('sheets.studies'),
      measurements: t('sheets.measurements')
    },
    headers: {
      code: t('headers.code'),
      date: t('headers.date'),
      studies: t('headers.studies'),
      implementation: t('headers.implementation'),
      observation: t('headers.observation'),
      note: t('headers.note'),
      name: t('headers.name'),
      unit: t('headers.unit'),
      role: t('headers.role'),
      kind: t('headers.kind'),
      defaultOrFormula: t('headers.defaultOrFormula'),
      study: t('headers.study'),
      description: t('headers.description'),
      sampleCount: t('headers.sampleCount'),
      sampleCodes: t('headers.sampleCodes'),
      sample: t('headers.sample'),
      technique: t('headers.technique'),
      measuredOn: t('headers.measuredOn')
    },
    roles: {
      parameter: t('roles.parameter'),
      result: t('roles.result'),
      calculated: t('roles.calculated')
    },
    kinds: { number: t('kinds.number'), text: t('kinds.text') }
  };

  const run = async (format: 'xlsx' | 'csv') => {
    try {
      // The spreadsheet library is large, so it is only downloaded when someone exports.
      const { tablesToWorkbook, tableToCsv } =
        await import('@/lib/export/tabular');
      const sheets = buildExperimentSheets({
        definitions,
        derivedColumns,
        derivedValues,
        samples,
        studies,
        characterizations,
        labels
      });
      if (format === 'xlsx') {
        downloadBytes(
          fileNameFor(experimentName, 'xlsx', 'samples'),
          tablesToWorkbook(sheets),
          XLSX_TYPE
        );
      } else {
        downloadBytes(
          fileNameFor(experimentName, 'csv', 'samples'),
          tableToCsv(sheets[0].table),
          CSV_TYPE
        );
      }
    } catch {
      toast.error(tErrors('unexpected'));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-tour="export-samples"
          />
        }
      >
        <UploadIcon aria-hidden />
        {t('button')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t(isSelection ? 'scopeSelected' : 'scopeAll', {
              count: samples.length
            })}
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => void run('xlsx')}>
            {t('excel')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void run('csv')}>
            {t('csv')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
