import { ExternalLinkIcon } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { ExpandableText } from '@/components/page/expandable-text';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import type { Reference } from '../types';
import { DeleteReferenceButton } from './delete-reference-button';
import { EditReferenceDialog } from './edit-reference-dialog';

/** One reference: its details, your note and its summary, with open, edit and delete. */
export const ReferenceCard = async ({
  projectId,
  reference,
  actions
}: {
  projectId: string;
  reference: Reference;
  /** Extra buttons from the page, shown before Edit. */
  actions?: ReactNode;
}) => {
  const [t, format] = await Promise.all([
    getTranslations('references.card'),
    getFormatter()
  ]);
  // A kept PDF opens from the app; a page or DOI opens at its own address.
  const openHref = reference.filePath
    ? `/api/references/${reference.id}`
    : reference.url;
  const byline = [reference.authors, reference.year]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="grid content-start gap-3 rounded-xl border p-4">
      <header className="grid gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{reference.title}</h3>
          <Badge variant="secondary" className="shrink-0">
            {t(`kind.${reference.kind}`)}
          </Badge>
        </div>
        {byline && <p className="text-muted-foreground text-sm">{byline}</p>}
        <p className="text-muted-foreground text-xs">
          {[
            reference.pageCount !== null
              ? t('pages', { count: reference.pageCount })
              : null,
            t('characters', { count: format.number(reference.characters) })
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {reference.isTruncated && (
          <p className="text-muted-foreground text-xs">{t('truncated')}</p>
        )}
      </header>
      {reference.note && (
        <div className="grid gap-0.5">
          <p className="text-muted-foreground text-xs">{t('note')}</p>
          <ExpandableText className="text-sm">{reference.note}</ExpandableText>
        </div>
      )}
      <div className="grid gap-0.5">
        <p className="text-muted-foreground text-xs">{t('summary')}</p>
        {reference.summary ? (
          <ExpandableText className="text-sm">
            {reference.summary}
          </ExpandableText>
        ) : (
          <p className="text-muted-foreground text-sm">{t('noSummary')}</p>
        )}
      </div>
      <footer className="flex flex-wrap items-center gap-1">
        {openHref && (
          <a
            href={openHref}
            target="_blank"
            rel="noreferrer"
            aria-label={t('open', { title: reference.title })}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ExternalLinkIcon aria-hidden />
            {t('openShort')}
          </a>
        )}
        {actions}
        <EditReferenceDialog projectId={projectId} reference={reference} />
        <DeleteReferenceButton projectId={projectId} reference={reference} />
      </footer>
    </article>
  );
};
