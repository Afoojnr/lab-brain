import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { NewProjectDialog } from './new-project-dialog';

const STEPS = ['project', 'experiment', 'samples'] as const;

/**
 * Shown on a first run, when there are no projects: a welcome with the create
 * button (and `actions` beside it), how the records fit together in three short
 * steps, and whatever the app adds under it (children).
 */
export const ProjectsEmpty = ({
  actions,
  children
}: {
  actions?: ReactNode;
  children?: ReactNode;
}) => {
  const t = useTranslations('home.empty');

  return (
    <section className="grid gap-10 pt-2">
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-base text-pretty">
          {t('description')}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <NewProjectDialog label={t('create')} />
          {actions}
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="bg-card grid content-start gap-2 rounded-xl border p-5"
          >
            <span
              aria-hidden
              className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-full text-xs font-medium"
            >
              {index + 1}
            </span>
            <h3 className="text-sm font-medium">{t(`steps.${step}.title`)}</h3>
            <p className="text-muted-foreground text-sm text-pretty">
              {t(`steps.${step}.text`)}
            </p>
          </li>
        ))}
      </ol>

      {children && <div className="grid gap-6 border-t pt-6">{children}</div>}
    </section>
  );
};
