'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';

import { assignStudyAction } from '../actions/assign-study';
import type { Study } from '../types';

type AssignStudyBarProps = {
  projectId: string;
  experimentId: string;
  studies: Study[];
  selectedIds: string[];
  /** Called once the samples are tagged, so the table can clear its selection. */
  onAssigned: () => void;
};

/** Shown while rows are selected: one button per study that tags all of them. */
export const AssignStudyBar = ({
  projectId,
  experimentId,
  studies,
  selectedIds,
  onAssigned
}: AssignStudyBarProps) => {
  const t = useTranslations('studies.assign');
  const tErrors = useTranslations('errors');
  const [isPending, startTransition] = useTransition();

  const assign = (study: Study) =>
    startTransition(async () => {
      try {
        const tagged = await assignStudyAction(
          projectId,
          experimentId,
          study.id,
          selectedIds
        );
        if (tagged === null) {
          toast.error(tErrors('unexpected'));
          return;
        }

        toast.success(t('done', { count: tagged, name: study.name }));
        onAssigned();
      } catch {
        toast.error(tErrors('unexpected'));
      }
    });

  return (
    <div
      role="group"
      aria-label={t('selected', { count: selectedIds.length })}
      className="bg-muted/50 mb-3 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm"
    >
      <span className="font-medium">
        {t('selected', { count: selectedIds.length })}
      </span>
      <Link
        href={`/plots?source=experiment&project=${projectId}&experiment=${experimentId}&samples=${selectedIds.join(',')}`}
        className={buttonVariants({ variant: 'default', size: 'sm' })}
      >
        {t('plot')}
      </Link>
      {studies.map(study => (
        <Button
          key={study.id}
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => assign(study)}
        >
          {t('assignTo', { name: study.name })}
        </Button>
      ))}
    </div>
  );
};
