'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { Experiment } from '../types';
import type { DeleteDetails } from './delete-dialog';
import { EditExperimentDialog } from './edit-experiment-dialog';
import { RecordMenu } from './record-menu';

/** The experiment page's ⋯ menu: Edit (opens the edit dialog) and Delete. */
export const ExperimentMenu = ({
  projectId,
  experiment,
  otherPrefixes,
  details
}: {
  projectId: string;
  experiment: Pick<Experiment, 'id' | 'name' | 'codePrefix' | 'protocol'>;
  otherPrefixes: string[];
  details?: DeleteDetails;
}) => {
  const t = useTranslations('experiments.form');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <RecordMenu
        edit={{ label: t('editTrigger'), onSelect: () => setIsEditing(true) }}
        details={details}
      />
      <EditExperimentDialog
        projectId={projectId}
        experiment={experiment}
        otherPrefixes={otherPrefixes}
        isOpen={isEditing}
        onOpenChange={setIsEditing}
      />
    </>
  );
};
