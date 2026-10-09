import { FolderPlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';

import { NewProjectDialog } from './new-project-dialog';

/**
 * Shown on a first run, when there are no projects: a welcome, the create
 * button, and whatever the app adds under it (children).
 */
export const ProjectsEmpty = ({ children }: { children?: ReactNode }) => {
  const t = useTranslations('home.empty');

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderPlusIcon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{t('title')}</EmptyTitle>
        <EmptyDescription>{t('description')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <NewProjectDialog label={t('create')} />
        {children}
      </EmptyContent>
    </Empty>
  );
};
