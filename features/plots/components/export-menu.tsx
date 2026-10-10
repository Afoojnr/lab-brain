'use client';

import { DownloadIcon } from 'lucide-react';
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

import type { ExportFormat } from '../export-plot';

const FIGURE_FORMATS = ['png', 'pdf', 'pptx'] as const;
const NUMBER_FORMATS = ['xlsx', 'csv'] as const;

type ExportMenuProps = {
  isDisabled: boolean;
  onExport: (format: ExportFormat) => void;
};

/** One button that saves the plot as a picture (PNG), a PDF, a PowerPoint slide, or its numbers (Excel, CSV). */
export const ExportMenu = ({ isDisabled, onExport }: ExportMenuProps) => {
  const t = useTranslations('plots.export');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" size="sm" />}
        disabled={isDisabled}
      >
        <DownloadIcon aria-hidden />
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
            <DropdownMenuItem key={format} onClick={() => onExport(format)}>
              {t(format)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
