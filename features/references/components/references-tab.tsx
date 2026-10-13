import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { listReferencesByProject } from '../data/references';
import { MAX_REFERENCES_PER_PROJECT } from '../config/limits';
import type { Reference } from '../types';
import { AddReferenceDialog } from './add-reference-dialog';
import { ReferenceCard } from './reference-card';

/**
 * A project's References tab: the papers and notes that give the assistant
 * background, each with your note and a short summary, and a button to add
 * another until the project reaches its limit.
 */
export const ReferencesTab = async ({
  projectId,
  renderActions
}: {
  projectId: string;
  /** Extra buttons for a reference's card, supplied by the page (the AI summary button). */
  renderActions?: (reference: Reference) => ReactNode;
}) => {
  const [t, references] = await Promise.all([
    getTranslations('references.tab'),
    listReferencesByProject(projectId)
  ]);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid max-w-2xl gap-1">
          <p className="text-muted-foreground text-sm">{t('description')}</p>
          <p className="text-muted-foreground text-xs">
            {t('usage', {
              count: references.length,
              max: MAX_REFERENCES_PER_PROJECT
            })}
          </p>
        </div>
        <AddReferenceDialog
          projectId={projectId}
          isDisabled={references.length >= MAX_REFERENCES_PER_PROJECT}
        />
      </div>
      {references.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
          {t('empty')}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {references.map(reference => (
            <li key={reference.id} className="min-w-0">
              <ReferenceCard
                projectId={projectId}
                reference={reference}
                actions={renderActions?.(reference)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
