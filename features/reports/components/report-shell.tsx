import { getFormatter, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { ReportToolbar } from './report-toolbar';

type ReportShellProps = {
  kind: 'experiment' | 'sample';
  title: string;
  /** One line under the title, e.g. the project and experiment a sample belongs to. */
  subtitle?: string;
  backHref: string;
  /** Reports print on A4 in this orientation. */
  orientation: 'landscape' | 'portrait';
  children: ReactNode;
};

/**
 * The page every report sits on: white paper in any theme, a toolbar that does
 * not print, the title, and when it was generated.
 */
export const ReportShell = async ({
  kind,
  title,
  subtitle,
  backHref,
  orientation,
  children
}: ReportShellProps) => {
  const [t, format] = await Promise.all([
    getTranslations('reports'),
    getFormatter()
  ]);

  return (
    <div className="report-paper bg-background text-foreground min-h-screen">
      <div
        className={cn(
          'report mx-auto w-full max-w-6xl px-4 py-8 md:px-8',
          orientation === 'landscape' ? 'report-landscape' : 'report-portrait'
        )}
      >
        <ReportToolbar backHref={backHref} />
        <header className="mb-8 grid gap-1 border-b pb-4">
          <p className="text-muted-foreground text-sm">{t(`kind.${kind}`)}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          <p className="text-muted-foreground text-xs">
            {t('generated', {
              date: format.dateTime(new Date(), { dateStyle: 'long' })
            })}
          </p>
        </header>
        <div className="grid gap-10">{children}</div>
      </div>
    </div>
  );
};
