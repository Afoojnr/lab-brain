import { CheckCircle2Icon, CircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

type ExperimentChecklistProps = {
  projectId: string;
  experimentId: string;
  /** Whether the experiment has any column yet, which ticks the first step. */
  hasColumns: boolean;
};

/**
 * Shown on an experiment with no samples: the two steps to start recording
 * (columns, then samples), with the first ticked once there are columns. It
 * goes away by itself when the first sample exists.
 */
export const ExperimentChecklist = ({
  projectId,
  experimentId,
  hasColumns
}: ExperimentChecklistProps) => {
  const t = useTranslations('experiments.checklist');
  const experimentPath = `/projects/${projectId}/experiments/${experimentId}`;

  return (
    <section className="grid gap-4 rounded-lg border border-dashed p-4">
      <header>
        <h3 className="font-medium">{t('title')}</h3>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </header>
      <ol className="grid gap-4">
        <li className="flex gap-3">
          {hasColumns ? (
            <CheckCircle2Icon
              aria-hidden
              className="text-primary mt-0.5 size-5 shrink-0"
            />
          ) : (
            <CircleIcon
              aria-hidden
              className="text-muted-foreground mt-0.5 size-5 shrink-0"
            />
          )}
          <div className="grid gap-1">
            <p className="font-medium">
              {t('step1Title')}
              <span className="sr-only">
                {' '}
                ({t(hasColumns ? 'done' : 'todo')})
              </span>
            </p>
            <p className="text-muted-foreground text-sm">{t('step1Text')}</p>
            <a
              href="#parameters"
              className="text-sm underline underline-offset-4"
            >
              {t('step1Action')}
            </a>
          </div>
        </li>
        <li className="flex gap-3">
          <CircleIcon
            aria-hidden
            className="text-muted-foreground mt-0.5 size-5 shrink-0"
          />
          <div className="grid gap-2">
            <p className="font-medium">
              {t('step2Title')}
              <span className="sr-only"> ({t('todo')})</span>
            </p>
            <p className="text-muted-foreground text-sm">{t('step2Text')}</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${experimentPath}/samples/new`}
                className={buttonVariants({ size: 'sm' })}
              >
                {t('step2Add')}
              </Link>
              <Link
                href={`/projects/${projectId}/import?experiment=${experimentId}`}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                {t('step2Import')}
              </Link>
            </div>
          </div>
        </li>
      </ol>
      <p className="text-muted-foreground text-xs">{t('later')}</p>
    </section>
  );
};
