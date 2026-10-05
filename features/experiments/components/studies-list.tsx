import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { ExpandableText } from '@/components/expandable-text';

import type { Study } from '../types';
import { EditStudyDialog } from './edit-study-dialog';

type StudiesListProps = {
  projectId: string;
  experimentId: string;
  experimentPath: string;
  studies: Study[];
  /** How many of the experiment's samples carry each study, by study id. */
  sampleCounts: Record<string, number>;
};

/** The experiment's studies, each linking to the sample table filtered to it, with a pencil to edit it. */
export const StudiesList = async ({
  projectId,
  experimentId,
  experimentPath,
  studies,
  sampleCounts
}: StudiesListProps) => {
  const t = await getTranslations('studies.panel');

  if (studies.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('empty')}</p>;
  }

  return (
    <ul className="grid gap-3">
      {studies.map(study => (
        <li key={study.id} className="text-sm">
          <div className="flex items-center gap-1">
            <Link
              href={`${experimentPath}?study=${study.id}`}
              aria-label={t('show', { name: study.name })}
              className="font-medium underline-offset-4 hover:underline"
            >
              {study.name}
            </Link>
            <span className="text-muted-foreground">
              {' · '}
              {t('samples', { count: sampleCounts[study.id] ?? 0 })}
            </span>
            <EditStudyDialog
              projectId={projectId}
              experimentId={experimentId}
              study={study}
              otherNames={studies
                .filter(other => other.id !== study.id)
                .map(other => other.name)}
            />
          </div>
          {study.description && (
            <ExpandableText className="text-muted-foreground text-xs">
              {study.description}
            </ExpandableText>
          )}
        </li>
      ))}
    </ul>
  );
};
