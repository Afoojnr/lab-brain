'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button, buttonVariants } from '@/components/ui/button';

type DoneStepProps = {
  projectId: string;
  result: {
    created: number;
    updated: number;
    skipped: number;
    experimentId: string;
  };
  onRestart: () => void;
};

/** Step 6: what was written, with a link to the experiment. */
export const DoneStep = ({ projectId, result, onRestart }: DoneStepProps) => {
  const t = useTranslations('import.done');

  return (
    <div className="grid gap-4">
      <p role="status" className="text-sm">
        {t('summary', {
          created: result.created,
          updated: result.updated,
          skipped: result.skipped
        })}
      </p>
      <p className="text-muted-foreground text-sm">{t('reminder')}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/projects/${projectId}/experiments/${result.experimentId}`}
          className={buttonVariants()}
        >
          {t('open')}
        </Link>
        <Button type="button" variant="outline" onClick={onRestart}>
          {t('again')}
        </Button>
      </div>
    </div>
  );
};
