import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { Study } from '../types';

type SamplesFilterProps = {
  experimentPath: string;
  studies: Study[];
  studyId?: string;
  query?: string;
};

/**
 * Search box and study chips above the sample table. It is a plain GET
 * form and plain links, so the chosen filter lives in the URL: it can be
 * bookmarked, shared and reloaded.
 */
export const SamplesFilter = async ({
  experimentPath,
  studies,
  studyId,
  query
}: SamplesFilterProps) => {
  const t = await getTranslations('studies.filter');
  const hrefFor = (nextStudyId: string | undefined) => {
    const params = new URLSearchParams();
    if (nextStudyId) params.set('study', nextStudyId);
    if (query) params.set('q', query);
    const search = params.toString();
    return search ? `${experimentPath}?${search}` : experimentPath;
  };
  const isFiltered = Boolean(studyId ?? query);

  return (
    <div role="group" aria-label={t('label')} className="mb-4 grid gap-3">
      <form role="search" method="get" className="flex max-w-lg gap-2">
        {studyId && <input type="hidden" name="study" value={studyId} />}
        <Input
          type="search"
          name="q"
          defaultValue={query ?? ''}
          aria-label={t('searchLabel')}
          placeholder={t('searchHint')}
        />
        <Button type="submit" variant="outline">
          {t('search')}
        </Button>
      </form>
      {studies.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={hrefFor(undefined)} aria-current={!studyId}>
            <Badge variant={studyId ? 'outline' : 'default'}>{t('all')}</Badge>
          </Link>
          {studies.map(study => (
            <Link
              key={study.id}
              href={hrefFor(study.id)}
              aria-current={study.id === studyId}
            >
              <Badge variant={study.id === studyId ? 'default' : 'outline'}>
                {study.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}
      {isFiltered && (
        <Link
          href={experimentPath}
          className="text-muted-foreground w-fit text-sm underline-offset-4 hover:underline"
        >
          {t('clear')}
        </Link>
      )}
    </div>
  );
};
