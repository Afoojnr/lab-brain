'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export default function WorkspaceError({ retry }: { retry: () => void }) {
  const t = useTranslations();

  return (
    <div
      role="alert"
      className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed text-center"
    >
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{t('errors.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('errors.description')}
        </p>
      </div>
      <Button variant="outline" onClick={() => retry()}>
        {t('common.tryAgain')}
      </Button>
    </div>
  );
}
