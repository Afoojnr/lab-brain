'use client';

import { ArrowLeftIcon, PrinterIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button, buttonVariants } from '@/components/ui/button';

/** Back and Print / Save as PDF. Hidden when printing, so the paper has only the report. */
export const ReportToolbar = ({ backHref }: { backHref: string }) => {
  const t = useTranslations('reports');

  return (
    <div
      data-print-hidden
      className="mb-6 flex flex-wrap items-center justify-between gap-2"
    >
      <Link href={backHref} className={buttonVariants({ variant: 'ghost' })}>
        <ArrowLeftIcon aria-hidden />
        {t('back')}
      </Link>
      <Button type="button" onClick={() => window.print()}>
        <PrinterIcon aria-hidden />
        {t('print')}
      </Button>
    </div>
  );
};
