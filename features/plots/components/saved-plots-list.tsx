'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { buttonVariants } from '@/components/ui/button';

import { DeleteSavedPlotButton } from './delete-saved-plot-button';

type SavedPlotsListProps = {
  projectId: string;
  experimentId: string;
  plots: { id: string; name: string }[];
  /** The saved plot that is open, if any. */
  openId: string | null;
};

/** The experiment's saved plots on the Plots page: open one, or delete it. */
export const SavedPlotsList = ({
  projectId,
  experimentId,
  plots,
  openId
}: SavedPlotsListProps) => {
  const t = useTranslations('plots.saved');
  const router = useRouter();
  const base = `/plots?source=experiment&project=${projectId}&experiment=${experimentId}`;

  return (
    <section aria-label={t('title')} className="grid gap-2">
      <h3 className="text-sm font-medium">{t('title')}</h3>
      {plots.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {plots.map(plot => (
            <li key={plot.id} className="flex items-center gap-1">
              <Link
                href={`${base}&plot=${plot.id}`}
                aria-current={plot.id === openId ? 'page' : undefined}
                aria-label={t('open', { name: plot.name })}
                className={buttonVariants({
                  variant: plot.id === openId ? 'default' : 'outline',
                  size: 'sm'
                })}
              >
                {plot.name}
              </Link>
              <DeleteSavedPlotButton
                projectId={projectId}
                experimentId={experimentId}
                plot={plot}
                // Deleting the plot that is open leaves it.
                onDeleted={
                  plot.id === openId ? () => router.push(base) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
