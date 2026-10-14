'use client';

import { UploadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

import type { FtirExportFormat } from '../export/export-ftir';

const FIGURE_FORMATS = ['png', 'pdf', 'pptx'] as const;
const NUMBER_FORMATS = ['xlsx', 'csv'] as const;

type FtirExportMenuProps = {
  isBusy: boolean;
  /** The values at the peaks exist only once there are peaks. */
  hasPeaks: boolean;
  onExport: (format: FtirExportFormat) => void;
};

/** One button that saves the chart as a picture (PNG), a PDF or a PowerPoint slide, or the value at each peak as Excel or CSV. */
export const FtirExportMenu = ({
  isBusy,
  hasPeaks,
  onExport
}: FtirExportMenuProps) => {
  const t = useTranslations('analysis.ftir.export');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" size="sm" />}
        disabled={isBusy}
      >
        <UploadIcon aria-hidden />
        {t('button')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('figure')}</DropdownMenuLabel>
          {FIGURE_FORMATS.map(format => (
            <DropdownMenuItem key={format} onClick={() => onExport(format)}>
              {t(format)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('numbers')}</DropdownMenuLabel>
          {NUMBER_FORMATS.map(format => (
            <DropdownMenuItem
              key={format}
              disabled={!hasPeaks}
              onClick={() => onExport(format)}
            >
              {t(format)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
