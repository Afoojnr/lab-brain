'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { Project } from '../types';
import type { DeleteDetails } from './delete-dialog';
import { EditProjectDialog } from './edit-project-dialog';
import { RecordMenu } from './record-menu';

/** The project page's ⋯ menu: Edit (opens the edit dialog) and Delete. */
export const ProjectMenu = ({
  project,
  details
}: {
  project: Pick<Project, 'id' | 'name' | 'description'>;
  details?: DeleteDetails;
}) => {
  const t = useTranslations('projects.form');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <RecordMenu
        edit={{ label: t('editTrigger'), onSelect: () => setIsEditing(true) }}
        details={details}
      />
      <EditProjectDialog
        project={project}
        isOpen={isEditing}
        onOpenChange={setIsEditing}
      />
    </>
  );
};
