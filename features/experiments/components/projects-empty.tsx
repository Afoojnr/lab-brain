import { FolderPlusIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';

import { NewProjectDialog } from './new-project-dialog';

/** Shown when there are no projects yet, with the same create action as the header. */
export const ProjectsEmpty = async () => {
  const t = await getTranslations('dashboard.empty');

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
        <NewProjectDialog />
      </EmptyContent>
    </Empty>
  );
};
